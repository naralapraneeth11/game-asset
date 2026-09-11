"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULTS, LIMITS, retainedBytes, validateSettings } from "./engine/core";
import type { Result, Settings, WorkerResponse } from "./engine/core";

export type Item = { id: string; file: File; path: string; state: "ready" | "queued" | "working" | "done" | "error" | "cancelled"; phase?: string; error?: string; result?: Result; settings?: Settings };
export type InputFile = { file: File; path: string };
export type ImportSummary = { added: number; duplicates: number; rejected: number; total: number; message: string };
type Active = { worker: Worker; timer: ReturnType<typeof setTimeout>; abort: AbortController };
const WORKER_URL = "/tools/image-compressor/v2/compress.worker.js";
const fingerprint = (file: File, path: string) => JSON.stringify([path.replace(/\\/g, "/"), file.name, file.size, file.lastModified]);
async function startupFailure(signal: AbortSignal, detail: string) {
  // Diagnose public assets only after startup failed; image bytes are never sent.
  for (const filename of ["compress.worker.js", "core.js", "headers.js"]) {
    const url = `/tools/image-compressor/v2/${filename}`;
    try {
      const response = await fetch(url, { cache: "no-store", signal });
      if (!response.ok) return `Compression files are missing from this deployment: ${filename} (HTTP ${response.status}). Upload the supplied public/tools/image-compressor/v2 folder or run the asset preparation step, then reload.`;
      if (!/javascript|ecmascript/i.test(response.headers.get("content-type") || "")) return `The server returned the wrong file type for ${filename}. Compression assets must be served as JavaScript, not an HTML page. Recheck the published public folder.`;
    } catch { return `The compression worker could not load. Reconnect and reload; if this persists, check that this deployment includes the worker files. ${detail}`; }
  }
  return `The worker files are available, but this browser could not start them. Check the site's worker security policy and use a current browser. ${detail}`;
}
export function useCompressor() {
  const [items, setItems] = useState<Item[]>([]), [settings, setSettings] = useState<Settings>({ ...DEFAULTS });
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [notice, setNotice] = useState(""), [maxPixels, setMaxPixels] = useState(LIMITS.pixels);
  const itemsRef = useRef(items), active = useRef(new Map<string, Active>()), pending = useRef<string[]>([]), mounted = useRef(true), runSettings = useRef({ ...DEFAULTS });
  const cap = useRef(LIMITS.pixels), pumpRef = useRef<() => void>(() => {});
  const update = useCallback((fn: (items: Item[]) => Item[]) => { if (!mounted.current) return; itemsRef.current = fn(itemsRef.current); setItems(itemsRef.current); }, []);
  const stopOne = useCallback((id: string) => { const job = active.current.get(id); if (job) { clearTimeout(job.timer); job.abort.abort(); job.worker.terminate(); active.current.delete(id); } pending.current = pending.current.filter(x => x !== id); }, []);
  const pump = useCallback(() => {
    // One active codec bounds retained WASM memory on desktop and mobile alike.
    if (!mounted.current || active.current.size || !pending.current.length) return;
    const id = pending.current.shift()!, item = itemsRef.current.find(x => x.id === id);
    if (!item) { pumpRef.current(); return; }
    const snapshot = { ...runSettings.current };
    update(list => list.map(x => x.id === id ? { ...x, state: "working", phase: "Starting encoder", result: undefined, error: undefined, settings: snapshot } : x));
    let worker: Worker;
    try { worker = new Worker(WORKER_URL, { type: "module", name: "image-compressor" }); }
    catch { const failed = new Set([id, ...pending.current]); pending.current = []; update(list => list.map(x => failed.has(x.id) ? { ...x, state: "error", phase: undefined, error: "Workers could not start. Check browser support and the site's worker policy." } : x)); return; }
    const finish = (result?: Result, error?: string) => {
      if (active.current.get(id)?.worker !== worker) return;
      stopOne(id);
      const retained = itemsRef.current.reduce((sum, x) => sum + (x.result ? retainedBytes(x.result) : 0), 0);
      if (result && retained + retainedBytes(result) > LIMITS.output) { error = "Output memory budget reached. Download and remove completed files, then retry."; result = undefined; }
      update(list => list.map(x => x.id === id ? { ...x, state: result ? "done" : "error", result, error, phase: undefined } : x));
      pumpRef.current();
    };
    const failStartup = (message: string) => {
      const queued = new Set(pending.current); pending.current = [];
      update(list => list.map(x => queued.has(x.id) ? { ...x, state: "error", phase: undefined, error: message } : x));
      finish(undefined, message);
    };
    let started = false, diagnosing = false, phase = "Loading worker";
    const abort = new AbortController();
    const diagnose = async (detail: string) => {
      const current = active.current.get(id); if (current?.worker !== worker || diagnosing || started) return;
      diagnosing = true; clearTimeout(current.timer);
      current.timer = setTimeout(() => { failStartup("Worker startup failed and the deployment check timed out. Reconnect, reload and confirm that the supplied public codec files were uploaded."); }, 8_000);
      const message = await startupFailure(abort.signal, detail);
      if (!started && active.current.get(id)?.worker === worker) failStartup(message);
    };
    const timer = setTimeout(() => { void diagnose("The worker did not confirm startup."); }, 15_000);
    active.current.set(id, { worker, timer, abort });
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      const current = active.current.get(id);
      if (current?.worker !== worker) return;
      if (data.type === "ready") {
        if (started) return;
        if (data.version !== "v2") { failStartup("The cached worker version does not match this tool. Reload after removing this tool's offline data."); return; }
        started = true; clearTimeout(current.timer);
        current.timer = setTimeout(() => finish(undefined, `Encoding timed out during ${phase.toLowerCase()}. Try a faster format or smaller dimensions.`), LIMITS.timeout);
        try { worker.postMessage({ id, file: item.file, settings: snapshot, maxPixels: cap.current }); }
        catch { finish(undefined, "The image could not be sent to the worker. Please retry."); }
        return;
      }
      if (data.id !== id) return;
      if (data.type === "phase") { phase = data.phase; update(list => list.map(x => x.id === id ? { ...x, phase: data.phase } : x)); }
      else if (data.type === "result") finish(data.result);
      else finish(undefined, data.message);
    };
    worker.onerror = event => {
      event.preventDefault();
      const detail = event.message && event.message !== "Script error." ? event.message.slice(0, 280) : "";
      if (!started) { void diagnose(detail); return; }
      finish(undefined, `The worker stopped during ${phase.toLowerCase()}. ${detail || "The browser did not provide a cause."} Retry with a smaller maximum width or use WebP/JPEG.`);
    };
    worker.onmessageerror = () => finish(undefined, "The worker result could not be read. Please retry.");
  }, [stopOne, update]);
  pumpRef.current = pump;
  useEffect(() => {
    mounted.current = true;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    cap.current = memory && memory >= 8 ? 16_000_000 : LIMITS.pixels; setMaxPixels(cap.current);
    return () => { mounted.current = false; pending.current = []; for (const job of active.current.values()) { clearTimeout(job.timer); job.abort.abort(); job.worker.terminate(); } active.current.clear(); };
  }, []);
  const add = useCallback((files: InputFile[]): ImportSummary => {
    const accepted: Item[] = [];
    const seen = new Set(itemsRef.current.map(x => fingerprint(x.file, x.path)));
    let totalBytes = itemsRef.current.reduce((sum, x) => sum + x.file.size, 0), rejected = 0, duplicates = 0;
    for (const source of files) {
      const path = source.path || source.file.name, key = fingerprint(source.file, path);
      if (seen.has(key)) { duplicates++; continue; }
      if (itemsRef.current.length + accepted.length >= LIMITS.files || source.file.size > LIMITS.file || source.file.size < 12 || totalBytes + source.file.size > LIMITS.batch) { rejected++; continue; }
      seen.add(key); totalBytes += source.file.size;
      accepted.push({ id: crypto.randomUUID(), file: source.file, path, state: "ready" });
    }
    update(list => [...list, ...accepted]);
    const total = itemsRef.current.length;
    const message = [accepted.length ? `${accepted.length} image${accepted.length === 1 ? "" : "s"} added.` : "No new images added.", duplicates ? `${duplicates} already attached; duplicates skipped.` : "", rejected ? `${rejected} skipped: up to 20 MB per image, 100 images and 200 MiB per session.` : "", `${total} in your queue.`].filter(Boolean).join(" ");
    const summary = { added: accepted.length, duplicates, rejected, total, message };
    setImportSummary(summary); setNotice(message); return summary;
  }, [update]);
  const start = useCallback((ids?: string[]) => {
    if (active.current.size || pending.current.length) return;
    try { runSettings.current = validateSettings(settings); } catch (e) { setNotice((e as Error).message); return; }
    pending.current = itemsRef.current.filter(x => !ids || ids.includes(x.id)).map(x => x.id);
    if (!pending.current.length) return;
    const selected = new Set(pending.current);
    update(list => list.map(x => selected.has(x.id) ? { ...x, state: "queued", result: undefined, error: undefined, settings: { ...runSettings.current } } : x));
    setNotice(""); pumpRef.current();
  }, [settings, update]);
  const cancel = useCallback((id?: string) => {
    const ids = id ? [id] : [...pending.current, ...active.current.keys()];
    for (const value of ids) stopOne(value);
    update(list => list.map(x => ids.includes(x.id) && ["working", "queued"].includes(x.state) ? { ...x, state: "cancelled", phase: undefined } : x));
    pumpRef.current();
  }, [stopOne, update]);
  const remove = useCallback((id: string) => { stopOne(id); update(list => list.filter(x => x.id !== id)); pumpRef.current(); }, [stopOne, update]);
  const clear = useCallback(() => { pending.current = []; for (const id of [...active.current.keys()]) stopOne(id); update(() => []); setImportSummary(null); setNotice("Session cleared. Image data is no longer retained by this tool."); }, [stopOne, update]);
  return { items, importSummary, settings, setSettings, notice, setNotice, maxPixels, add, start, cancel, remove, clear, busy: items.some(x => x.state === "working" || x.state === "queued") };
}
