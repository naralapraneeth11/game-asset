import { FFmpeg, type FFFSType } from "@ffmpeg/ffmpeg";
import { LIMITS, type ExportRequest, type ExportResult, type MediaInfo, type ProgressUpdate } from "../types";
import { createColorLut, createOverlay } from "./pixels";
import { clamp, errorText, geometry, isAudio, mimeType, outputName } from "./shared";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let logs: string[] = [];
let encoders = "";
let cancelled = false;
const base = "/tools/video-editor/vendor";
const absolute = (path: string) => new URL(path, self.location.origin).href;

async function load(onProgress?: (update: ProgressUpdate) => void): Promise<FFmpeg> {
  if (instance?.loaded) return instance;
  if (loading) return loading;
  cancelled = false;
  loading = (async () => {
    onProgress?.({ phase: "Loading compatibility engine", progress: null, engine: "ffmpeg", detail: "Downloading app code only; your video stays on this device." });
    for (const multi of self.crossOriginIsolated && typeof SharedArrayBuffer !== "undefined" ? [true, false] : [false]) {
      const ffmpeg = new FFmpeg();
      instance = ffmpeg;
      ffmpeg.on("log", ({ message }) => { logs.push(message); if (logs.length > 100) logs.shift(); });
      const folder = multi ? "multi" : "single";
      try {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            ffmpeg.load({ classWorkerURL: absolute(`${base}/ffmpeg/worker.js`), coreURL: absolute(`${base}/${folder}/ffmpeg-core.js`), wasmURL: absolute(`${base}/${folder}/ffmpeg-core.wasm`), ...(multi ? { workerURL: absolute(`${base}/multi/ffmpeg-core.worker.js`) } : {}) }),
            new Promise<never>((_, reject) => { timer = setTimeout(() => { ffmpeg.terminate(); reject(new Error("Video engine loading timed out.")); }, 90_000); }),
          ]);
        } finally { clearTimeout(timer); }
        if (cancelled) throw new Error("Cancelled");
        logs = [];
        const available: string[] = [];
        const capture = ({ message }: { message: string }) => available.push(message);
        ffmpeg.on("log", capture);
        try { await ffmpeg.exec(["-hide_banner", "-encoders"], 10_000); }
        finally { ffmpeg.off("log", capture); }
        encoders = available.join("\n");
        return ffmpeg;
      } catch (error) {
        ffmpeg.terminate(); instance = null;
        if (cancelled) throw new Error("Cancelled");
        if (!multi) throw new Error(`Compatibility engine could not load. Run the video asset preparation script and reload. ${errorText(error)}`);
      }
    }
    throw new Error("Video engine unavailable.");
  })();
  try { return await loading; } finally { loading = null; }
}

export function cancelFallback(): void { cancelled = true; instance?.terminate(); instance = null; loading = null; }
export function disposeFallback(): void { cancelFallback(); logs = []; encoders = ""; }

async function mount(ffmpeg: FFmpeg, file: File) {
  if (file.size > LIMITS.fallbackInput) throw new Error("This operation needs compatibility mode, which accepts files up to 256 MiB. Use native-compatible settings or a smaller source file.");
  await ffmpeg.createDir("/input").catch(() => undefined);
  // WORKERFS reads the File on demand without a full input ArrayBuffer copy.
  const mounted = await ffmpeg.mount("WORKERFS" as FFFSType, { blobs: [{ name: "source", data: file }] }, "/input");
  if (!mounted) throw new Error("This FFmpeg build does not provide the required file reader. Re-prepare the bundled assets.");
}

interface Probe { format?: { duration?: string; format_name?: string }; streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number; channels?: number; sample_aspect_ratio?: string; avg_frame_rate?: string; duration?: string; sample_rate?: string; nb_read_packets?: string; side_data_list?: { rotation?: number }[]; color_transfer?: string; color_primaries?: string }[] }
async function readProbe(ffmpeg: FFmpeg, path: string, countPackets = false): Promise<Probe> {
  await ffmpeg.deleteFile("/probe.json").catch(() => undefined);
  const code = await ffmpeg.ffprobe(["-v", "error", ...(countPackets ? ["-count_packets"] : []), "-show_format", "-show_streams", "-of", "json", path, "-o", "/probe.json"], 30_000);
  if (code !== 0) throw new Error("This file could not be read. It may be damaged, encrypted or unsupported by the bundled codecs.");
  const text = await ffmpeg.readFile("/probe.json", "utf8");
  return JSON.parse(typeof text === "string" ? text : new TextDecoder().decode(text)) as Probe;
}

function probeDuration(probe: Probe): number {
  const container = Number(probe.format?.duration);
  if (Number.isFinite(container) && container > 0) return container;
  return Math.max(0, ...(probe.streams ?? []).map((stream) => Number(stream.duration)).filter((duration) => Number.isFinite(duration) && duration > 0));
}

export async function probeFallback(file: File, onProgress?: (update: ProgressUpdate) => void): Promise<MediaInfo> {
  const ffmpeg = await load(onProgress);
  let mounted = false;
  try {
    await mount(ffmpeg, file); mounted = true;
    const data = await readProbe(ffmpeg, "/input/source");
    const video = data.streams?.find((stream) => stream.codec_type === "video");
    const audio = data.streams?.find((stream) => stream.codec_type === "audio");
    if (!video?.width || !video.height) throw new Error("Choose a file containing a video track.");
    const duration = probeDuration(data);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("The video's duration could not be determined.");
    const [n, d] = (video.avg_frame_rate || "30/1").split("/").map(Number);
    const rotated = Math.abs(video.side_data_list?.find((side) => typeof side.rotation === "number")?.rotation || 0) % 180 === 90;
    const hdr = ["smpte2084", "arib-std-b67"].includes(video.color_transfer || "") || ["bt2020", "smpte432"].includes(video.color_primaries || "");
    const [sarN, sarD] = (video.sample_aspect_ratio || "1:1").split(":").map(Number);
    const displayWidth = Math.round(video.width * (sarN > 0 && sarD > 0 ? sarN / sarD : 1));
    return { duration, width: rotated ? video.height : displayWidth, height: rotated ? displayWidth : video.height, frameRate: n > 0 && d > 0 ? n / d : 30, videoCodec: video.codec_name || "unknown", audioCodec: audio?.codec_name || "", audioSampleRate: Number(audio?.sample_rate) || 48000, hasAudio: !!audio, format: data.format?.format_name || "video", warnings: ["Read using the compatibility engine.", ...(hdr ? ["HDR or wide-gamut source: color-managed HDR export is not supported. Use an SDR source to preserve predictable colors."] : []), ...((data.streams?.length ?? 0) > (audio ? 2 : 1) ? ["Only the primary video and audio tracks are exported; additional tracks and subtitles are omitted."] : [])] };
  } finally {
    if (mounted && ffmpeg.loaded) await ffmpeg.unmount("/input").catch(() => undefined);
    if (ffmpeg.loaded) await ffmpeg.deleteFile("/probe.json").catch(() => undefined);
  }
}

function tempo(speed: number): string {
  const stages: string[] = [];
  while (speed > 2) { stages.push("atempo=2"); speed /= 2; }
  while (speed < 0.5) { stages.push("atempo=0.5"); speed /= 0.5; }
  stages.push(`atempo=${speed}`);
  return stages.join(",");
}

export async function fallbackExport(request: ExportRequest, onProgress: (update: ProgressUpdate) => void): Promise<ExportResult> {
  const { file, info, settings: s } = request;
  if (!isAudio(s.format) && info.warnings.some((warning) => /HDR/i.test(warning))) throw new Error("HDR export needs explicit tone mapping, which is not supported in this version. Choose an SDR source.");
  const geo = geometry(info, s);
  if (isAudio(s.format) && !info.hasAudio) throw new Error("This source has no audio track to extract.");
  if (!isAudio(s.format) && s.codec === "av1" && s.format !== "gif") throw new Error("AV1 requires a supported native encoder. Change the codec to H.264 or VP9 for compatibility mode.");
  const expected = isAudio(s.format) ? geo.duration * (s.format === "wav" ? 192_000 : 16_000) : geo.duration * (geo.videoBitrate + geo.audioBitrate) / 8;
  if (expected > LIMITS.ffmpegOutput * 0.9 && s.format !== "gif") throw new Error("Estimated compatibility output exceeds the 128 MiB memory limit. Reduce the duration, resolution, quality or target size.");
  const ffmpeg = await load(onProgress);
  const name = `/output.${s.format}`;
  let mounted = false;
  let palettePass = s.format === "gif";
  const progress = ({ time }: { time: number }) => onProgress({ phase: palettePass ? "Building GIF palette" : "Encoding", progress: s.format === "gif" ? clamp((palettePass ? 0 : 0.4) + time / 1_000_000 / geo.duration * (palettePass ? 0.4 : 0.57), 0, palettePass ? 0.4 : 0.97) : clamp(time / 1_000_000 / geo.duration, 0, 0.97), engine: "ffmpeg", detail: "Compatibility mode · processing on this device" });
  ffmpeg.on("progress", progress);
  try {
    await mount(ffmpeg, file); mounted = true;
    logs = [];
    // Bound demux/decode at the source trim-out, before any speed or palette filters.
    const args = ["-hide_banner", "-protocol_whitelist", "file,pipe", "-filter_threads", "2", "-filter_complex_threads", "2", "-ss", String(geo.start), "-t", String(geo.end - geo.start), "-i", "/input/source"];
    // FFmpeg normalizes the input timeline when seeking. Preserve each track's
    // relative initial offset instead of independently resetting both to zero.
    const audioFilters = [`asetpts=PTS/${s.speed}`];
    if (s.speed !== 1) audioFilters.push(s.preservePitch ? tempo(s.speed) : `asetrate=${Math.round(info.audioSampleRate * s.speed)},aresample=${info.audioSampleRate}`);
    if (s.volume !== 1) audioFilters.push(`volume=${clamp(s.volume, 0, 2)}`);
    if (s.normalize) audioFilters.push("loudnorm=I=-16:TP=-1.5:LRA=11");
    if (isAudio(s.format)) {
      args.push("-map", "0:a:0", "-vn", "-af", audioFilters.join(","), "-c:a", s.format === "mp3" ? "libmp3lame" : s.format === "wav" ? "pcm_s16le" : "aac", "-ar", "48000", "-ac", "2");
      if (s.format !== "wav") args.push("-b:a", "128k");
    } else {
      const video = [`scale=${Math.round(info.width)}:${Math.round(info.height)}:flags=lanczos`, "setsar=1", "format=rgba", `crop=${geo.crop.width}:${geo.crop.height}:${geo.crop.x}:${geo.crop.y}:exact=1`];
      if (s.rotate === 90) video.push("transpose=clock");
      if (s.rotate === 180) video.push("hflip", "vflip");
      if (s.rotate === 270) video.push("transpose=cclock");
      if (s.flipX) video.push("hflip");
      if (s.flipY) video.push("vflip");
      video.push(`scale=${geo.width}:${geo.height}:flags=lanczos`, `setpts=PTS/${s.speed}`);
      const lut = await createColorLut(s);
      if (lut) {
        await ffmpeg.writeFile("/color.cube", new TextEncoder().encode(lut));
        video.push("lut3d=file=/color.cube:interp=tetrahedral");
      }
      const overlay = await createOverlay(geo.width, geo.height, s, request.watermark);
      if (overlay) { await ffmpeg.writeFile("/overlay.png", new Uint8Array(await overlay.arrayBuffer())); args.push("-i", "/overlay.png"); }
      let graph = `[0:v:0]${video.join(",")}[base];`;
      graph += overlay ? "[base][1:v:0]overlay=0:0:format=auto[composite];" : "[base]null[composite];";
      if (s.format === "gif") {
        // One split graph can hold every frame while palettegen waits for EOF.
        // Two bounded passes keep just a palette and the current decoded frames.
        onProgress({ phase: "Building GIF palette", progress: 0, engine: "ffmpeg" });
        const paletteCode = await ffmpeg.exec([...args, "-filter_complex", `${graph}[composite]fps=${Math.min(s.fps, 15)},palettegen=stats_mode=diff[p]`, "-map", "[p]", "-frames:v", "1", "-an", "-threads", "2", "-y", "/palette.png"], 30 * 60_000);
        if (paletteCode !== 0) throw new Error(`The GIF palette could not be generated. ${logs.slice(-4).join(" ").slice(-500)}`);
        palettePass = false;
        args.push("-i", "/palette.png");
        graph += `[composite]fps=${Math.min(s.fps, 15)}[indexed];[indexed][${overlay ? 2 : 1}:v:0]paletteuse=dither=sierra2_4a[vout]`;
      } else graph += `[composite]fps=${s.fps},format=yuv420p[vout]`;
      args.push("-filter_complex", graph, "-map", "[vout]");
      if (s.mute || !info.hasAudio || s.format === "gif") args.push("-an");
      else args.push("-map", "0:a:0", "-af", audioFilters.join(","), "-c:a", s.format === "webm" ? "libopus" : "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2");
      if (s.format === "gif") args.push("-loop", "0");
      else {
        const encoder = s.codec === "hevc" ? "libx265" : s.codec === "vp9" ? "libvpx-vp9" : "libx264";
        if (!encoders.includes(encoder)) throw new Error(`The bundled compatibility engine cannot encode ${s.codec}. Choose H.264 or VP9.`);
        args.push("-c:v", encoder, "-b:v", String(geo.videoBitrate));
        if (encoder === "libvpx-vp9") args.push("-deadline", "realtime", "-cpu-used", "5");
        else args.push("-preset", "veryfast");
        if (encoder === "libx265") args.push("-tag:v", "hvc1", "-x265-params", "pools=2:frame-threads=2");
        if (s.format === "mp4" || s.format === "mov") args.push("-movflags", "+faststart");
      }
      args.push("-metadata:s:v:0", "rotate=0");
    }
    args.push("-t", String(geo.duration), "-map_metadata", "-1", "-map_chapters", "-1", "-threads", "2", "-fs", String(LIMITS.ffmpegOutput), "-y", name);
    onProgress({ phase: "Encoding", progress: 0, engine: "ffmpeg" });
    const code = await ffmpeg.exec(args, 30 * 60_000);
    if (code !== 0) throw new Error(`The compatibility encoder stopped (${code}). ${logs.slice(-5).join(" ").slice(-900)}`);
    onProgress({ phase: "Finalizing", progress: 0.98, engine: "ffmpeg" });
    const data = await ffmpeg.readFile(name);
    if (typeof data === "string" || !data.byteLength) throw new Error("The encoder produced no output.");
    if (data.byteLength >= LIMITS.ffmpegOutput * 0.98) throw new Error("Output reached the compatibility memory limit and may be incomplete. Lower the target size or shorten the clip.");
    const check = await readProbe(ffmpeg, name, s.format === "aac");
    const aac = s.format === "aac" ? check.streams?.find((stream) => stream.codec_type === "audio") : undefined;
    // ADTS has no duration header; bitrate-based duration guesses are unreliable.
    // Our AAC-LC encoder writes 1024 samples per packet, so count packets instead.
    const packetDuration = aac ? Number(aac.nb_read_packets) * 1024 / Number(aac.sample_rate) : NaN;
    const outputDuration = Number.isFinite(packetDuration) && packetDuration > 0 ? packetDuration : probeDuration(check);
    if (!Number.isFinite(outputDuration) || Math.abs(outputDuration - geo.duration) > Math.max(0.5, 2 / s.fps)) throw new Error("Output duration did not match the selected clip. The result was discarded instead of saving an incomplete file.");
    return { id: request.id, blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: mimeType(s.format) }), filename: outputName(file.name, s.format), engine: "ffmpeg", duration: outputDuration, width: isAudio(s.format) ? 0 : geo.width, height: isAudio(s.format) ? 0 : geo.height, warnings: [...info.warnings, ...(info.hasAudio && (!s.mute || isAudio(s.format)) && s.format !== "gif" ? ["Compatibility audio is exported at 48 kHz in stereo."] : []), "Compatibility mode limits input and output size; decoding memory also depends on the source dimensions and codec.", ...(s.targetMB > 0 ? ["Target size is an estimate; container overhead and codec rate control can change the final size."] : [])] };
  } finally {
    ffmpeg.off("progress", progress);
    if (ffmpeg.loaded) {
      if (mounted) await ffmpeg.unmount("/input").catch(() => undefined);
      for (const path of [name, "/overlay.png", "/palette.png", "/probe.json", "/color.cube"]) await ffmpeg.deleteFile(path).catch(() => undefined);
    }
  }
}

/** Decodes one source frame; composition is shared with the native snapshot renderer. */
export async function fallbackFrame(file: File, time: number): Promise<Blob> {
  if (!Number.isFinite(time)) throw new Error("Choose a valid frame time.");
  const ffmpeg = await load();
  let mounted = false;
  try {
    await mount(ffmpeg, file); mounted = true;
    const code = await ffmpeg.exec(["-hide_banner", "-protocol_whitelist", "file,pipe", "-ss", String(Math.max(0, time)), "-i", "/input/source", "-map", "0:v:0", "-frames:v", "1", "-vf", "scale=w='min(3840,iw*sar)':h='min(2160,ih)':force_original_aspect_ratio=decrease,setsar=1", "-threads", "2", "-fs", String(64 * 1024 ** 2), "-y", "/frame.png"], 60_000);
    if (code !== 0) throw new Error("The selected frame could not be decoded. Try another position.");
    const data = await ffmpeg.readFile("/frame.png");
    if (typeof data === "string" || !data.byteLength) throw new Error("The selected frame is unavailable.");
    return new Blob([data as Uint8Array<ArrayBuffer>], { type: "image/png" });
  } finally {
    if (ffmpeg.loaded) {
      if (mounted) await ffmpeg.unmount("/input").catch(() => undefined);
      await ffmpeg.deleteFile("/frame.png").catch(() => undefined);
    }
  }
}
