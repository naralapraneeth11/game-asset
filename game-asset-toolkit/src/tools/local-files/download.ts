"use client";

export interface DownloadFile { name: string; blob: Blob }
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name.replace(/[\\/\u0000-\u001f]/g, "_");
  link.style.display = "none";
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Existing media is already compressed; store it in a ZIP without recompressing. */
export function createZip(files: DownloadFile[], signal?: AbortSignal, onProgress?: (completed: number, total: number) => void): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("ZIP cancelled.", "AbortError")); return; }
    if (!files.length) { reject(new Error("There are no files to download.")); return; }
    if (files.length > 2048 || files.reduce((sum, file) => sum + file.blob.size, 0) > 128 * 1024 ** 2) {
      reject(new Error("ZIP downloads allow up to 2,048 files and 128 MiB. Download larger results separately or reduce the batch.")); return;
    }
    let worker: Worker;
    try { worker = new Worker(new URL("./zip.worker.ts", import.meta.url), { type: "module", name: "local-download-zip" }); }
    catch { reject(new Error("The ZIP worker could not start. Download files individually or reload in a current browser.")); return; }
    let settled = false;
    const finish = (error?: Error, blob?: Blob) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener("abort", abort); worker.terminate();
      if (error) reject(error); else if (blob) resolve(blob); else reject(new Error("ZIP creation returned no file."));
    };
    const abort = () => finish(new DOMException("ZIP cancelled.", "AbortError"));
    const timer = setTimeout(() => finish(new Error("ZIP creation timed out. Save smaller batches.")), 120_000);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<{ type: string; completed?: number; total?: number; blob?: Blob; error?: string }>) => {
      if (data.type === "progress") onProgress?.(data.completed ?? 0, data.total ?? files.length);
      else if (data.type === "done") finish(undefined, data.blob);
      else if (data.type === "error") finish(new Error(data.error || "ZIP creation failed."));
    };
    worker.onerror = (event) => { event.preventDefault(); finish(new Error("The ZIP worker stopped. Try a smaller batch.")); };
    worker.onmessageerror = () => finish(new Error("The browser could not read the ZIP worker response."));
    try { worker.postMessage({ files }); } catch { finish(new Error("The files could not be sent to the ZIP worker.")); }
  });
}
