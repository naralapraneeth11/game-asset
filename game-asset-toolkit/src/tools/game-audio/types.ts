export interface AudioSettings {
  quality: number;
  sampleRate: 0 | 44100 | 48000;
  channels: 0 | 1 | 2;
  start: number;
  end: number;
  volume: number;
  normalize: boolean;
}

export const DEFAULT_SETTINGS: AudioSettings = {
  quality: 5, sampleRate: 0, channels: 0, start: 0, end: 0, volume: 1, normalize: false,
};

export const AUDIO_LIMITS = { input: 256 * 1024 ** 2, output: 128 * 1024 ** 2, retained: 256 * 1024 ** 2, queue: 20 } as const;

export interface AudioInfo { duration: number; channels: number; sampleRate: number; codec: string; tracks: number }
export interface AudioResult { blob: Blob; name: string; info: AudioInfo; warnings: string[] }
export type WorkerRequest = { type: "convert"; id: string; file: File; settings: AudioSettings } | { type: "cancel" };
export type WorkerReply =
  | { type: "progress"; id: string; phase: string; progress: number | null }
  | { type: "result"; id: string; result: AudioResult }
  | { type: "error"; id: string; message: string }
  | { type: "cancelled" };

export interface AudioItem {
  id: string; file: File; status: "ready" | "processing" | "done" | "error" | "cancelled";
  phase: string; progress: number | null; error?: string; result?: AudioResult;
}
