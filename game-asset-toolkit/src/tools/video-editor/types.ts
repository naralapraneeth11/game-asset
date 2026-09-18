export type Container = "mp4" | "webm" | "mov" | "gif" | "mp3" | "wav" | "aac";
export type VideoCodec = "h264" | "hevc" | "vp9" | "av1";
export type ColorLook = "none" | "warm" | "cool" | "mono" | "cinema";
export interface CropRect { x: number; y: number; width: number; height: number }
export interface VideoSettings {
  format: Container; codec: VideoCodec; quality: number; resolution: number;
  targetMB: number; fps: number; trimStart: number; trimEnd: number;
  crop: CropRect; rotate: 0 | 90 | 180 | 270; flipX: boolean; flipY: boolean;
  speed: number; preservePitch: boolean;
  brightness: number; contrast: number; saturation: number; exposure: number; look: ColorLook;
  text: string; font: "sans-serif" | "serif" | "monospace"; fontSize: number;
  textColor: string; textX: number; textY: number; textOpacity: number;
  watermarkX: number; watermarkY: number; watermarkWidth: number; watermarkOpacity: number;
  mute: boolean; volume: number; normalize: boolean;
}
export interface MediaInfo {
  duration: number; width: number; height: number; frameRate: number;
  videoCodec: string; audioCodec: string; hasAudio: boolean; audioSampleRate: number;
  format: string; warnings: string[];
}
export interface CapabilityReport {
  native: Partial<Record<VideoCodec, boolean>>; opfs: boolean; isolated: boolean;
  wasm: boolean; rust: boolean; notes: string[];
}
export type EngineName = "native" | "ffmpeg";
export interface ProgressUpdate { phase: string; progress: number | null; engine?: EngineName; detail?: string }
export interface ExportRequest { id: string; file: File; info: MediaInfo; settings: VideoSettings; watermark: File | null }
export interface ExportResult { id: string; blob: Blob; filename: string; engine: EngineName; duration: number; width: number; height: number; warnings: string[]; workspaceId?: string }
export interface QueueItem { id: string; file: File; info?: MediaInfo; status: "reading" | "ready" | "processing" | "done" | "error" | "cancelled"; progress: number | null; phase: string; error?: string; result?: ExportResult }
export const DEFAULT_SETTINGS: VideoSettings = {
  format: "mp4", codec: "h264", quality: 0.72, resolution: 1080,
  targetMB: 0, fps: 30, trimStart: 0, trimEnd: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 }, rotate: 0, flipX: false, flipY: false,
  speed: 1, preservePitch: true, brightness: 0, contrast: 1, saturation: 1, exposure: 0, look: "none",
  text: "", font: "sans-serif", fontSize: 5, textColor: "#ffffff", textX: 0.5, textY: 0.85, textOpacity: 1,
  watermarkX: 0.85, watermarkY: 0.12, watermarkWidth: 0.18, watermarkOpacity: 0.8,
  mute: false, volume: 1, normalize: false,
};
export const LIMITS = { queue: 20, nativeInput: 8 * 1024 ** 3, fallbackInput: 256 * 1024 ** 2, memoryOutput: 128 * 1024 ** 2, ffmpegOutput: 128 * 1024 ** 2, pixels: 3840 * 2160, gifSeconds: 30, gifWidth: 640, batchZip: 256 * 1024 ** 2 } as const;
