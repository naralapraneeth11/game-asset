export type ScalerMode = "pixel" | "density";
export type Sampling = "nearest" | "smooth";
export interface ScaleSettings { mode: ScalerMode; factor: number; inputDensity: 1 | 2 | 3; sampling: Sampling }
export interface SourceInfo { width: number; height: number; format: string }
export interface ScaleOutput { name: string; blob: Blob; width: number; height: number; density?: number; factor?: number }
export interface ScaleResult { source: SourceInfo; outputs: ScaleOutput[]; settings: ScaleSettings }
export interface QueueItem { id: string; file: File; status: "ready" | "working" | "done" | "error" | "cancelled"; progress: number; phase: string; result?: ScaleResult; error?: string }
export const LIMITS = { files: 24, fileBytes: 32 * 1024 ** 2, sourcePixels: 16_777_216, outputPixels: 16_777_216, operationMemory: 256 * 1024 ** 2, retainedBytes: 96 * 1024 ** 2, zipBytes: 96 * 1024 ** 2, edge: 8192 } as const;
export type WorkerRequest = { id: number; kind: "scale"; file: File; settings: ScaleSettings };
export type WorkerReply = { id: number; kind: "progress"; progress: number; phase: string } | { id: number; kind: "result"; result: ScaleResult } | { id: number; kind: "error"; message: string };
export function readableBytes(value: number) { return value >= 1024 ** 2 ? `${(value / 1024 ** 2).toFixed(1)} MB` : value >= 1024 ? `${(value / 1024).toFixed(1)} KB` : `${value} B`; }
export function signature(settings: ScaleSettings) { return JSON.stringify(settings); }
export function cleanStem(filename: string) { return (filename.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/, "").slice(0, 100) || "image"); }
