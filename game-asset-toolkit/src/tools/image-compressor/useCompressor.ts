"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULTS, LIMITS, validateSettings } from "./engine/core";
import type { Result, Settings, WorkerResponse } from "./engine/core";

export type Item = { id: string; file: File; path: string; state: "ready" | "queued" | "working" | "done" | "error" | "cancelled"; phase?: string; error?: string; result?: Result; settings?: Settings };
export type InputFile = { file: File; path: string };
type Active = { worker: Worker; timer: ReturnType<typeof setTimeout> };
export function useCompressor() {
  const [items, setItems] = useState<Item[]>([]), [settings, setSettings] = useState<Settings>({ ...DEFAULTS });
  const [notice, setNotice] = useState(""), [maxPixels, setMaxPixels] = useState(LIMITS.pixels);
  const itemsRef = useRef(items), active = useRef(new Map<string, Active>()), pending = useRef<string[]>([]), mounted = useRef(true), runSettings = useRef({ ...DEFAULTS });
  const cap = useRef(LIMITS.pixels), pumpRef = useRef<() => void>(() => {});
  const update = useCallback((fn: (items: Item[]) => Item[]) => { if (!mounted.current) return; itemsRef.current = fn(itemsRef.current); setItems(itemsRef.current); }, []);
  const stopOne = useCallback((id: string) => { const job = active.current.get(id); if (job) { clearTimeout(job.timer); job.worker.terminate(); active.current.delete(id); } pending.current = pending.current.filter(x => x !== id); }, []);
  const pump = useCallback(() => {
    // One active codec bounds retained WASM memory on desktop and mobile alike.
    if (!mounted.current || active.current.size || !pending.current.length) return;
    const id = pending.current.shift()!, item = itemsRef.current.find(x => x.id === id);
    if (!item) { pumpRef.current(); return; }
    const snapshot = { ...runSettings.current };
    update(list => list.map(x => x.id === id ? { ...x, state: "working", phase: "Starting encoder", result: undefined, error: undefined, settings: snapshot } : x));
    let worker: Worker;
    try { worker = new Worker("/tools/image-compressor/v1/compress.worker.js", { type: "module", name: "image-compressor" }); }
    catch { update(list => list.map(x => x.id === id ? { ...x, state: "error", error: "Workers could not start. Check browser support and the site's worker policy." } : x)); pumpRef.current(); return; }
    const finish = (result?: Result, error?: string) => {
      if (active.current.get(id)?.worker !== worker) return;
      stopOne(id);
      const retained = itemsRef.current.reduce((sum, x) => sum + (x.result?.blob.size || 0) + (x.result && x.settings?.format === "jxl" ? x.result.preview.size : 0), 0);
      if (result && retained + result.blob.size + (snapshot.format === "jxl" ? result.preview.size : 0) > LIMITS.output) { error = "Output memory budget reached. Download and remove completed files, then retry."; result = undefined; }
      update(list => list.map(x => x.id === id ? { ...x, state: result ? "done" : "error", result, error, phase: undefined } : x));
      pumpRef.current();
    };
    const timer = setTimeout(() => finish(undefined, "Encoding timed out. Try a smaller image, faster effort or a different format."), LIMITS.timeout);
    active.current.set(id, { worker, timer });
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (data.id !== id || active.current.get(id)?.worker !== worker) return;
      if (data.type === "phase") update(list => list.map(x => x.id === id ? { ...x, phase: data.phase } : x));
      else if (data.type === "result") finish(data.result);
      else finish(undefined, data.message);
    };
    worker.onerror = event => { event.preventDefault(); finish(undefined, "The image worker stopped. Confirm codec assets were prepared, or try a smaller image."); };
    worker.onmessageerror = () => finish(undefined, "The worker result could not be read. Please retry.");
    try { worker.postMessage({ id, file: item.file, settings: snapshot, maxPixels: cap.current }); }
    catch { finish(undefined, "The image could not be sent to the worker. Please retry."); }
  }, [stopOne, update]);
  pumpRef.current = pump;
  useEffect(() => {
    mounted.current = true;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    cap.current = memory && memory >= 8 ? 16_000_000 : LIMITS.pixels; setMaxPixels(cap.current);
    return () => { mounted.current = false; pending.current = []; for (const job of active.current.values()) { clearTimeout(job.timer); job.worker.terminate(); } active.current.clear(); };
  }, []);
  const add = useCallback((files: InputFile[]) => {
    const accepted: Item[] = []; let total = itemsRef.current.reduce((sum, x) => sum + x.file.size, 0), rejected = 0;
    for (const source of files) {
      if (itemsRef.current.length + accepted.length >= LIMITS.files || source.file.size > LIMITS.file || source.file.size < 12 || total + source.file.size > LIMITS.batch) { rejected++; continue; }
      total += source.file.size;
      accepted.push({ id: crypto.randomUUID(), file: source.file, path: source.path || source.file.name, state: "ready" });
    }
    update(list => [...list, ...accepted]);
    setNotice(rejected ? `${accepted.length} added; ${rejected} skipped. Limits: 20 MB per image, 100 images, 200 MiB per session.` : `${accepted.length} image${accepted.length === 1 ? "" : "s"} added. Files stay on your device.`);
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
  const clear = useCallback(() => { pending.current = []; for (const id of [...active.current.keys()]) stopOne(id); update(() => []); setNotice("Session cleared. Image data is no longer retained by this tool."); }, [stopOne, update]);
  return { items, settings, setSettings, notice, setNotice, maxPixels, add, start, cancel, remove, clear, busy: items.some(x => x.state === "working" || x.state === "queued") };
}
