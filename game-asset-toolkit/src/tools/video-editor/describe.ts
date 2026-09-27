import type { VideoSettings } from "./types";

export const VIDEO_ACCEPT = "video/*,.mkv,.mov,.webm,.mp4,.m4v,.avi,.mts,.m2ts,.ts";

/** One-line description of the export settings, shown on collapsed Advanced headers. */
export function describeExport(settings: VideoSettings): string {
  const format = settings.format.toUpperCase();
  if (settings.format === "mp3" || settings.format === "wav" || settings.format === "aac") return `${format} audio`;
  if (settings.format === "gif") return `GIF · ${settings.gifWidth} px wide · ${Math.min(settings.fps, 15)} fps`;
  const codec = { h264: "H.264", hevc: "HEVC", vp9: "VP9", av1: "AV1" }[settings.codec];
  const size = settings.targetMB ? `≈${settings.targetMB} MB` : `quality ${Math.round(settings.quality * 100)}%`;
  return [format, codec, settings.resolution ? `${settings.resolution}p` : "Original size", `${settings.fps} fps`, size, settings.mute ? "no audio" : ""].filter(Boolean).join(" · ");
}
