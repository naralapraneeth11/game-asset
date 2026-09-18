import { LIMITS, type Container, type MediaInfo, type VideoSettings } from "../types";

export function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
export function geometry(info: MediaInfo, settings: VideoSettings) {
  const numbers = [info.duration, info.width, info.height, settings.speed, settings.fps, settings.resolution, settings.targetMB, settings.quality, settings.trimStart, settings.trimEnd, settings.crop.x, settings.crop.y, settings.crop.width, settings.crop.height];
  if (!numbers.every(Number.isFinite)) throw new Error("A video setting is not a valid number.");
  if (info.duration <= 0 || info.width < 2 || info.height < 2) throw new Error("The video has invalid dimensions or duration.");
  if (settings.speed < 0.25 || settings.speed > 4) throw new Error("Choose a speed between 0.25× and 4×.");
  if (settings.fps < 1 || settings.fps > 60) throw new Error("Choose an output frame rate from 1 to 60 fps.");
  if (settings.targetMB < 0 || settings.targetMB > 100_000) throw new Error("Enter a target size between 0 and 100,000 MB.");
  const start = clamp(settings.trimStart, 0, info.duration);
  const end = settings.trimEnd > 0 ? clamp(settings.trimEnd, 0, info.duration) : info.duration;
  if (end - start < 0.04) throw new Error("Trim out must be at least 0.04 seconds after trim in.");
  const x = Math.round(clamp(settings.crop.x, 0, 1 - 2 / info.width) * info.width);
  const y = Math.round(clamp(settings.crop.y, 0, 1 - 2 / info.height) * info.height);
  const cw = Math.max(2, Math.min(info.width - x, Math.round(settings.crop.width * info.width)));
  const ch = Math.max(2, Math.min(info.height - y, Math.round(settings.crop.height * info.height)));
  const portraitRotation = settings.rotate === 90 || settings.rotate === 270;
  const rotatedWidth = portraitRotation ? ch : cw, rotatedHeight = portraitRotation ? cw : ch;
  let scale = settings.resolution > 0 ? Math.min(1, settings.resolution / rotatedHeight) : 1;
  scale = Math.min(scale, Math.sqrt(LIMITS.pixels / (rotatedWidth * rotatedHeight)), 4096 / Math.max(rotatedWidth, rotatedHeight));
  if (settings.format === "gif") scale = Math.min(scale, LIMITS.gifWidth / rotatedWidth);
  const width = Math.max(2, Math.floor(rotatedWidth * scale / 2) * 2);
  const height = Math.max(2, Math.floor(rotatedHeight * scale / 2) * 2);
  const duration = (end - start) / settings.speed;
  if (settings.format === "gif" && duration > LIMITS.gifSeconds) throw new Error("GIF export is limited to 30 seconds. Trim the clip or increase playback speed.");
  const targetMB = isAudio(settings.format) || settings.format === "gif" ? 0 : settings.targetMB;
  const audioBitrate = !settings.mute && info.hasAudio ? 128_000 : 0;
  const target = targetMB * 1_000_000 * 8 * 0.96 / duration - audioBitrate;
  if (targetMB > 0 && target < 50_000) throw new Error("That target is too small for this duration and audio track. Increase the target, trim the clip, or mute audio.");
  const videoBitrate = Math.round(targetMB > 0 ? Math.min(100_000_000, target) : clamp(width * height * settings.fps * (0.045 + clamp(settings.quality, 0, 1) * 0.17), 150_000, 60_000_000));
  return { width, height, crop: { x, y, width: cw, height: ch }, duration, start, end, videoBitrate, audioBitrate };
}

export function mimeType(format: Container): string {
  return { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", gif: "image/gif", mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac" }[format];
}
export function outputName(name: string, format: Container): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 150) || "video";
  return `${base}_edited.${format}`;
}
export function isAudio(format: Container): boolean { return format === "mp3" || format === "wav" || format === "aac"; }
export function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error || "Video processing failed."); }
