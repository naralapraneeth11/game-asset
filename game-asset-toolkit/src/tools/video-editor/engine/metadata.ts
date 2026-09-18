import { ALL_FORMATS, HLS, BlobSource, Input } from "mediabunny";
import { LIMITS, type MediaInfo } from "../types";

let activeProbe: Input | null = null;
export function cancelProbe(): void { activeProbe?.dispose(); activeProbe = null; }

/** BlobSource uses bounded range reads; a selected file is never loaded wholesale. */
export function openMedia(file: File): Input {
  if (!file.size) throw new Error("This file is empty. Choose a video or audio file with content.");
  if (file.size > LIMITS.nativeInput) throw new Error("This file exceeds the 8 GiB local processing limit. Split it into smaller clips first.");
  // Playlists can reference remote segments, so only self-contained local formats are accepted.
  return new Input({ formats: ALL_FORMATS.filter((format) => format !== HLS), source: new BlobSource(file, { maxCacheSize: 8 * 1024 ** 2 }) });
}

export async function probeNative(file: File): Promise<MediaInfo> {
  const input = openMedia(file);
  activeProbe = input;
  try {
    const [video, audio, tracks, format] = await Promise.all([
      input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack(), input.getTracks(), input.getFormat(),
    ]);
    if (!video && !audio) throw new Error("No readable video or audio track was found in this file.");
    const primary = [video, audio].filter((track) => track !== null);
    const duration = await input.getDurationFromMetadata(primary) ?? await input.computeDuration(primary);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("The file has no readable finite duration. Live streams are not supported.");
    const [width, height, stats, videoCodec, audioCodec, audioSampleRate, hdr] = await Promise.all([
      video?.getDisplayWidth() ?? 0, video?.getDisplayHeight() ?? 0,
      video?.computePacketStats(120) ?? null, video?.getCodecParameterString() ?? "",
      audio?.getCodecParameterString() ?? "", audio?.getSampleRate() ?? 0,
      video?.hasHighDynamicRange() ?? false,
    ]);
    const warnings: string[] = [];
    if (tracks.length > primary.length) warnings.push("Only the primary video and audio tracks are exported. Extra tracks, subtitles and attachments are omitted.");
    if (hdr) warnings.push("HDR or wide-gamut color detected. An explicit SDR conversion is required; the native canvas path cannot preserve HDR.");
    if (video && (!width || !height)) throw new Error("The video dimensions could not be read.");
    return {
      duration, width, height, frameRate: Number.isFinite(stats?.averagePacketRate) ? stats!.averagePacketRate : 0,
      videoCodec: videoCodec ?? "unknown", audioCodec: audioCodec ?? "unknown", hasAudio: Boolean(audio),
      audioSampleRate, format: format.name, warnings,
    };
  } finally {
    input.dispose();
    if (activeProbe === input) activeProbe = null;
  }
}
