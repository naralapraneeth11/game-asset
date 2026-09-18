export type ExportFormat = "mp4" | "webm" | "gif" | "mp3" | "wav" | "aac";
export type VideoQuality = "low" | "medium" | "high" | "original";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  hasVideo: boolean;
  frameRate?: number;
  videoCodec?: string;
  audioCodec?: string;
  container?: string;
  sizeBytes: number;
  name: string;
}

export interface TrimRange {
  start: number;
  end: number;
}

export interface ResizeSettings {
  width: number;
  height: number;
  maintainAspect: boolean;
}

export interface ColorAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

export interface ExportSettings {
  format: ExportFormat;
  quality: VideoQuality;
  fps?: number;
  audioOnly?: boolean;
}

export type EngineKind = "native" | "ffmpeg" | "mediabunny";

export interface ProgressEvent {
  ratio: number;
  phase: string;
  message?: string;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  durationMs: number;
  engine: EngineKind;
}

export interface CapabilityReport {
  sharedArrayBuffer: boolean;
  crossOriginIsolated: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  wasmSimd: boolean;
  preferredEngine: EngineKind;
}
