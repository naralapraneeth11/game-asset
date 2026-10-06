export type SpriteMode = "gif" | "split";

export interface SpriteInfo {
  width: number;
  height: number;
  frameCount: number;
  durationMs: number;
  background: string | null;
  preview: Blob;
  warnings: string[];
}

export interface GifOptions {
  start: number;
  end: number;
  stride: number;
  maxFrames: number;
  columns: number;
  scale: number;
  padding: number;
  background: "transparent" | "gif";
  includeFrames: boolean;
}

export interface SplitOptions {
  sizing: "grid" | "cell";
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  margin: number;
  gutter: number;
  offsetX: number;
  offsetY: number;
  start: number;
  count: number;
  order: "row" | "column";
  padding: number;
  skipTransparent: boolean;
}

export interface SpriteOutput { name: string; blob: Blob }
export interface SpriteResult {
  files: SpriteOutput[];
  zipName: string;
  preview: Blob;
  summary: string;
  warnings: string[];
}
export interface Progress { value: number; label: string }
export type ProgressHandler = (progress: Progress) => void;

export type WorkerRequest =
  | { id: number; action: "inspect"; mode: SpriteMode; file: File }
  | { id: number; action: "gif"; file: File; options: GifOptions }
  | { id: number; action: "split"; file: File; options: SplitOptions };
export type WorkerReply =
  | { id: number; kind: "progress"; progress: Progress }
  | { id: number; kind: "info"; info: SpriteInfo }
  | { id: number; kind: "result"; result: SpriteResult }
  | { id: number; kind: "error"; message: string };

export const GIF_DEFAULTS: GifOptions = {
  start: 1, end: 0, stride: 1, maxFrames: 512, columns: 0,
  scale: 1, padding: 1, background: "transparent", includeFrames: false,
};
export const SPLIT_DEFAULTS: SplitOptions = {
  sizing: "grid", columns: 4, rows: 4, cellWidth: 32, cellHeight: 32,
  margin: 0, gutter: 0, offsetX: 0, offsetY: 0,
  start: 1, count: 0, order: "row", padding: 0, skipTransparent: false,
};
export const SPRITE_LIMITS = {
  gifBytes: 32 * 1024 * 1024,
  imageBytes: 64 * 1024 * 1024,
  gifPixels: 4 * 1024 * 1024,
  imagePixels: 16 * 1024 * 1024,
  atlasPixels: 16 * 1024 * 1024,
  canvasSide: 8192,
  inputFrames: 5000,
  gifFrames: 512,
  splitFrames: 1024,
  decodePixels: 300 * 1024 * 1024,
  outputBytes: 64 * 1024 * 1024,
} as const;
