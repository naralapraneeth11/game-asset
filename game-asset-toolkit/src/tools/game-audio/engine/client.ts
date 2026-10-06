import type { AudioResult, AudioSettings, WorkerReply, WorkerRequest } from "../types";

/** One owner and one active request; FFmpeg's virtual filesystem is never shared concurrently. */
export class AudioWorkerClient {
  private worker: Worker | null = null;
  private reject: ((error: Error) => void) | null = null;

  convert(file: File, settings: AudioSettings, update: (phase: string, progress: number | null) => void): Promise<AudioResult> {
    if (this.reject) return Promise.reject(new Error("An audio conversion is already running."));
    const worker = this.worker ??= new Worker(new URL("./audio.worker.ts", import.meta.url), { type: "module" });
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.reject = reject;
      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        const data = event.data;
        if (data.type === "cancelled" || data.id !== id) return;
        if (data.type === "progress") { update(data.phase, data.progress); return; }
        this.reject = null;
        worker.onmessage = null;
        if (data.type === "result") resolve(data.result);
        else reject(new Error(data.message));
      };
      worker.onerror = (event) => {
        event.preventDefault();
        this.reject = null;
        this.worker = null;
        worker.postMessage({ type: "cancel" } satisfies WorkerRequest);
        setTimeout(() => worker.terminate(), 150);
        reject(new Error("The audio worker stopped. Reload and try a shorter file, or confirm the audio engine assets were prepared."));
      };
      worker.postMessage({ type: "convert", id, file, settings } satisfies WorkerRequest);
    });
  }

  cancel() {
    const worker = this.worker;
    this.worker = null;
    this.reject?.(new DOMException("Cancelled", "AbortError"));
    this.reject = null;
    if (!worker) return;
    // Let the app worker terminate FFmpeg's nested worker before terminating it.
    const timer = setTimeout(() => worker.terminate(), 250);
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.type === "cancelled") { clearTimeout(timer); worker.terminate(); }
    };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); };
    worker.postMessage({ type: "cancel" } satisfies WorkerRequest);
  }
}
