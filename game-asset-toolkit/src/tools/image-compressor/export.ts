import { Zip, ZipPassThrough, strToU8 } from "fflate";
import { safePath, savings } from "./engine/core";
import type { Item } from "./useCompressor";
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export function downloadItem(item: Item) { if (item.result && item.settings) download(item.result.blob, safePath(item.file.name, item.settings.format, new Set())); }
export async function downloadZip(items: Item[], onProgress: (n: number) => void, signal: AbortSignal) {
  const ready = items.filter(x => x.result && x.settings);
  if (!ready.length) throw new Error("Compress an image first.");
  if (ready.reduce((n, x) => n + x.result!.blob.size, 0) > 64 * 1024 ** 2) throw new Error("This ZIP would exceed the 64 MiB archive budget. Download files individually or remove some results first.");
  const chunks: Uint8Array<ArrayBuffer>[] = [], names = new Set<string>(["compression-report.json"]), report: object[] = [];
  let failed: Error | undefined;
  let resolveDone!: (blob: Blob) => void, rejectDone!: (error: Error) => void;
  const done = new Promise<Blob>((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  // Suppress an unhandled-rejection window if a synchronous zip callback fails during assembly.
  void done.catch(() => {});
  const zip = new Zip((error, data, final) => {
    if (error) { failed = error; rejectDone(error); return; }
    if (data?.length) chunks.push(new Uint8Array(data));
    if (final) resolveDone(new Blob(chunks, { type: "application/zip" }));
  });
  const abort = () => { zip.terminate(); rejectDone(new Error("ZIP download cancelled.")); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    for (let i = 0; i < ready.length; i++) {
      if (signal.aborted) throw new Error("ZIP download cancelled.");
      const item = ready[i], result = item.result!, settings = item.settings!;
      const name = safePath(item.path, settings.format, names), stream = new ZipPassThrough(name);
      zip.add(stream);
      for (let p = 0; p < result.blob.size; p += 256 * 1024) {
        if (signal.aborted) throw new Error("ZIP download cancelled.");
        stream.push(new Uint8Array(await result.blob.slice(p, p + 256 * 1024).arrayBuffer()), p + 256 * 1024 >= result.blob.size);
        if (failed) throw failed;
      }
      report.push({ source: item.path, output: name, originalBytes: item.file.size, outputBytes: result.blob.size, savingsPercent: savings(item.file.size, result.blob.size), width: result.width, height: result.height, elapsedMs: Math.round(result.elapsed), targetMet: result.targetMet, quality: result.quality, settings, warnings: result.warnings });
      onProgress(i + 1); await new Promise(resolve => setTimeout(resolve, 0));
    }
    const metadata = new ZipPassThrough("compression-report.json"); zip.add(metadata);
    metadata.push(strToU8(JSON.stringify({ tool: "Game Asset Toolkit / Image Compressor", version: 1, files: report }, null, 2)), true); zip.end();
    const blob = await done; if (signal.aborted) throw new Error("ZIP download cancelled.");
    download(blob, "compressed-images.zip");
  } finally { signal.removeEventListener("abort", abort); if (signal.aborted || failed) zip.terminate(); }
}
