import {
  Conversion, Input, Mp4OutputFormat, MovOutputFormat, WebMOutputFormat, Output, Quality, VideoSampleSink,
  canEncodeAudio, canEncodeVideo, type InputVideoTrack, type InputAudioTrack, type VideoCodec,
  type VideoSample,
} from "mediabunny";
import type { ExportRequest, ExportResult, ProgressUpdate, MediaInfo, VideoSettings, VideoCodec as ToolVideoCodec } from "../types";
import { openMedia } from "./metadata";
import { geometry, mimeType, outputName } from "./shared";
import { createFrameRenderer } from "./pixels";
import { createOutputStorage, type OutputStorage } from "./storage";

export { probeNative } from "./metadata";

type Support = { supported: boolean; reason: string };
type ActiveJob = { cancelled: boolean; conversionCancelled: boolean; conversion: Conversion | null; input: Input | null };
let active: ActiveJob | null = null;
const codecs: Record<ExportRequest["settings"]["codec"], VideoCodec> = { h264: "avc", hevc: "hevc", av1: "av1", vp9: "vp9" };

function reject(reason: string): Support { return { supported: false, reason }; }
function aborted(): Error { return new DOMException("Export cancelled.", "AbortError"); }
function checkCancelled(job: ActiveJob): void { if (job.cancelled) throw aborted(); }

/** A representative 1080p30 audit; each export still checks its own input and output. */
export async function auditNative(): Promise<Partial<Record<ToolVideoCodec, boolean>>> {
  const result: Partial<Record<ToolVideoCodec, boolean>> = {};
  const profiles: Record<ToolVideoCodec, string> = {
    h264: "avc1.640028", hevc: "hev1.1.6.L120.B0", vp9: "vp09.00.40.08", av1: "av01.0.08M.08",
  };
  for (const codec of Object.keys(profiles) as ToolVideoCodec[]) {
    result[codec] = false;
    if (typeof VideoEncoder === "undefined" || typeof OffscreenCanvas === "undefined") continue;
    try {
      const config: VideoEncoderConfig = {
        codec: profiles[codec], width: 1920, height: 1080, bitrate: 6_000_000,
        bitrateMode: "variable", framerate: 30, hardwareAcceleration: "no-preference", alpha: "discard",
        ...(codec === "h264" ? { avc: { format: "avc" as const } } : {}),
        ...(codec === "hevc" ? { hevc: { format: "hevc" as const } } : {}),
      };
      const declared = await VideoEncoder.isConfigSupported(config);
      result[codec] = Boolean(declared.supported) && await canEncodeVideo(codecs[codec], {
        width: 1920, height: 1080, quality: new Quality({ bitrate: 6_000_000 }),
        fullCodecString: profiles[codec], hardwareAcceleration: "no-preference",
      });
    } catch { result[codec] = false; }
  }
  return result;
}

/** Extract and edit a single frame entirely inside this worker. */
export async function nativeSnapshot(
  file: File, info: MediaInfo, settings: VideoSettings, watermark: File | null,
  format: "png" | "jpeg", time: number,
): Promise<Blob> {
  if (active) throw new Error("Wait for the current export to stop before extracting a frame.");
  if (!Number.isFinite(time)) throw new Error("Choose a valid frame time.");
  if (format !== "png" && format !== "jpeg") throw new Error("Choose PNG or JPEG for the frame image.");
  const job: ActiveJob = { cancelled: false, conversionCancelled: false, conversion: null, input: null };
  active = job;
  let sample: VideoSample | null = null;
  let renderer: Awaited<ReturnType<typeof createFrameRenderer>> | null = null;
  try {
    const input = openMedia(file);
    job.input = input;
    const track = await input.getPrimaryVideoTrack();
    if (!track || !await track.canDecode()) throw new Error("This browser cannot decode a frame from the selected video.");
    if (await track.hasHighDynamicRange()) throw new Error("HDR frames require explicit SDR color conversion through the compatibility encoder.");
    checkCancelled(job);
    const first = await track.getFirstTimestamp();
    const position = Math.max(first, Math.min(Math.max(0, info.duration - 0.001), Math.max(0, time)));
    sample = await new VideoSampleSink(track).getSample(position);
    if (!sample) throw new Error("No frame could be decoded at this time. Choose another position in the video.");
    checkCancelled(job);
    // Frame capture uses the current visual settings but is independent of the
    // movie's target bitrate and trim duration validation.
    const frameSettings = { ...settings, targetMB: 0, trimStart: 0, trimEnd: Math.min(info.duration, 1) };
    renderer = await createFrameRenderer(info, frameSettings, watermark);
    checkCancelled(job);
    const surface = renderer.render(sample);
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const blob = await surface.convertToBlob({ type: mime, quality: 0.95 });
    checkCancelled(job);
    if (!blob.size || blob.type !== mime) throw new Error("The browser could not encode the requested image format.");
    return blob;
  } catch (error) {
    if (job.cancelled) throw aborted();
    throw error;
  } finally {
    sample?.close();
    renderer?.dispose();
    job.input?.dispose();
    if (active === job) active = null;
  }
}

function eligibility(request: ExportRequest): Support {
  const { settings } = request;
  if (typeof OffscreenCanvas === "undefined" || typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") {
    return reject("This browser does not provide the required worker video APIs.");
  }
  if (!["mp4", "mov", "webm"].includes(settings.format)) return reject("This output format uses the compatibility encoder.");
  if (settings.speed !== 1 || settings.volume !== 1 || settings.normalize) return reject("Audio processing or speed changes use the compatibility encoder.");
  if (settings.format === "webm" && settings.codec !== "vp9" && settings.codec !== "av1") return reject("WebM requires VP9 or AV1.");
  if (settings.format !== "webm" && settings.codec === "vp9") return reject("VP9 is exported in WebM.");
  return { supported: true, reason: "Native WebCodecs with streamed local output." };
}

async function checkTracks(request: ExportRequest, video: InputVideoTrack | null, audio: InputAudioTrack | null): Promise<Support> {
  if (!video) return reject("The native video path requires a video track.");
  if (await video.hasHighDynamicRange()) return reject("HDR and wide-gamut inputs require explicit color conversion through the compatibility encoder.");
  if (!await video.canDecode()) return reject("This browser cannot decode the input video codec/profile.");
  const dimensions = geometry(request.info, request.settings);
  if (!await canEncodeVideo(codecs[request.settings.codec], {
    width: dimensions.width, height: dimensions.height,
    quality: new Quality({ bitrate: dimensions.videoBitrate }), hardwareAcceleration: "no-preference",
  })) return reject("The requested video codec, dimensions or bitrate are unavailable in this browser.");
  if (audio && !request.settings.mute) {
    if (!await audio.canDecode()) return reject("This browser cannot decode the input audio track.");
    const channels = await audio.getNumberOfChannels();
    if (!await canEncodeAudio(request.settings.format === "webm" ? "opus" : "aac", {
      sampleRate: 48000, numberOfChannels: channels, quality: new Quality({ bitrate: dimensions.audioBitrate }),
    })) return reject("This browser cannot encode the required audio codec/channel configuration.");
  }
  return { supported: true, reason: "The input decoders and selected output encoders are supported." };
}

/** Called in the dedicated worker; actual track profiles are checked, not just codec names. */
export async function nativeSupport(request: ExportRequest): Promise<Support> {
  const basic = eligibility(request);
  if (!basic.supported) return basic;
  let input: Input | null = null;
  try {
    input = openMedia(request.file);
    const [video, audio] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]);
    return await checkTracks(request, video, audio);
  } catch (error) {
    return reject(error instanceof Error ? error.message : "This input needs the compatibility encoder.");
  } finally { input?.dispose(); }
}

export async function cancelNative(): Promise<void> {
  const job = active;
  if (!job || job.cancelled) return;
  job.cancelled = true;
  try {
    if (job.conversion) { job.conversionCancelled = true; await job.conversion.cancel(); }
  }
  finally { job.input?.dispose(); }
}

export async function nativeExport(request: ExportRequest, onProgress: (update: ProgressUpdate) => void): Promise<ExportResult> {
  if (active) throw new Error("Another native export is still running. Wait for it to stop first.");
  const allowed = eligibility(request);
  if (!allowed.supported) throw new Error(allowed.reason);
  const job: ActiveJob = { cancelled: false, conversionCancelled: false, conversion: null, input: null };
  active = job;
  let storage: OutputStorage | null = null;
  let renderer: Awaited<ReturnType<typeof createFrameRenderer>> | null = null;
  let output: Output | null = null;
  let completed = false;
  try {
    onProgress({ phase: "Preparing native export", progress: 0, engine: "native" });
    const input = openMedia(request.file);
    job.input = input;
    const [video, audio, tracks] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack(), input.getTracks()]);
    const support = await checkTracks(request, video, audio);
    checkCancelled(job);
    if (!support.supported) throw new Error(support.reason);
    const dimensions = geometry(request.info, request.settings);
    const estimatedBytes = dimensions.duration * (dimensions.videoBitrate + dimensions.audioBitrate) / 8 * 1.05;
    storage = await createOutputStorage(request.id, estimatedBytes);
    checkCancelled(job);
    renderer = await createFrameRenderer(request.info, request.settings, request.watermark);
    checkCancelled(job);
    // A seekable stream permits ordinary MP4/MOV without buffering the movie in RAM.
    // moov is written at the end; no false "fast start" promise is made for local downloads.
    const format = request.settings.format === "webm" ? new WebMOutputFormat()
      : request.settings.format === "mov" ? new MovOutputFormat({ fastStart: false })
      : new Mp4OutputFormat({ fastStart: false });
    output = new Output({ format, target: storage.target });
    const frameRenderer = renderer;
    const conversion = await Conversion.init({
      input, output, tracks: "primary", copy: false, tags: {}, showWarnings: false,
      trim: { start: dimensions.start, end: dimensions.end },
      video: {
        codec: codecs[request.settings.codec], quality: new Quality({ bitrate: dimensions.videoBitrate }),
        forceTranscode: true, allowRotationMetadata: false, hardwareAcceleration: "no-preference",
        frameRate: request.settings.fps > 0 ? request.settings.fps : undefined,
        processedWidth: dimensions.width, processedHeight: dimensions.height,
        process(sample) { checkCancelled(job); return frameRenderer.render(sample); },
      },
      audio: request.settings.mute || !audio ? { discard: true } : {
        codec: request.settings.format === "webm" ? "opus" : "aac", sampleRate: 48000,
        numberOfChannels: await audio.getNumberOfChannels(),
        quality: new Quality({ bitrate: dimensions.audioBitrate }), forceTranscode: true,
      },
    });
    job.conversion = conversion;
    checkCancelled(job);
    const missing = conversion.discardedTracks.filter((track) => track.reason !== "discarded_by_user");
    if (!conversion.isValid || missing.length) {
      throw new Error(`An input track could not be exported${missing.length ? ` (${missing.map((track) => track.reason.replaceAll("_", " ")).join(", ")})` : ""}. Choose another codec or browser.`);
    }
    // Conversion awaits encoder writes, preserves original sample timestamps, and clamps
    // video/audio at the same trim boundaries. It owns and closes all VideoSamples.
    let lastNotice = 0;
    conversion.onProgress = (fraction) => {
      const now = performance.now();
      if (fraction < 1 && now - lastNotice < 80) return;
      lastNotice = now;
      onProgress({ phase: fraction >= 1 ? "Finalizing file" : "Encoding video", progress: Math.max(0, Math.min(0.99, fraction * 0.98)), engine: "native" });
    };
    await conversion.execute();
    checkCancelled(job);
    const blob = await storage.finish(mimeType(request.settings.format));
    checkCancelled(job);
    const warnings = [...request.info.warnings];
    if (tracks.length > (video ? 1 : 0) + (audio ? 1 : 0) && !warnings.some((message) => message.includes("primary"))) {
      warnings.push("Only the primary video and audio tracks were exported. Additional tracks and subtitles were omitted.");
    }
    if (!storage.workspaceId) warnings.push("Disk-backed browser storage was unavailable; this export used the bounded 128 MiB memory fallback.");
    if (request.settings.targetMB > 0) warnings.push("Target size is an estimate; encoder rate control and container overhead can change the final size.");
    if (await video?.canBeTransparent()) warnings.push("Video transparency was flattened for this export.");
    completed = true;
    onProgress({ phase: "Ready to download", progress: 1, engine: "native" });
    return {
      id: request.id, blob, filename: outputName(request.file.name, request.settings.format), engine: "native",
      duration: dimensions.duration, width: dimensions.width, height: dimensions.height,
      warnings: [...new Set(warnings)], workspaceId: storage.workspaceId,
    };
  } catch (error) {
    if (job.cancelled) throw aborted();
    throw error;
  } finally {
    if (!completed) {
      try {
        if (job.conversion && !job.conversionCancelled) { job.conversionCancelled = true; await job.conversion.cancel(); }
        if (!job.conversion && output) await output.cancel();
      } catch { /* The original export failure is preserved; file cleanup still follows. */ }
      await storage?.abort().catch(() => undefined);
    }
    renderer?.dispose();
    job.input?.dispose();
    if (active === job) active = null;
  }
}
