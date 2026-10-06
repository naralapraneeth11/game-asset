"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createZip, downloadBlob } from "@/tools/local-files/download";
import { LIMITS, signature, type QueueItem, type ScaleResult, type ScalerMode, type ScaleSettings, type WorkerReply } from "./types";

const duplicateKey = (file: File) => `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
const abortError = () => new DOMException("Processing cancelled.", "AbortError");

export function usePixelScaler(mode: ScalerMode) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const itemsRef = useRef<QueueItem[]>([]);
  const [selectedId, select] = useState<string | null>(null);
  const [settings, setSettings] = useState<ScaleSettings>({ mode, factor: 4, inputDensity: 1, sampling: "nearest" });
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const generation = useRef(0);
  const worker = useRef<Worker | null>(null);
  const rejectWorker = useRef<((reason: Error) => void) | null>(null);
  const archiveController = useRef<AbortController | null>(null);
  const update = useCallback((transform: (current: QueueItem[]) => QueueItem[]) => {
    itemsRef.current = transform(itemsRef.current);
    if (mounted.current) setItems(itemsRef.current);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; worker.current?.terminate(); worker.current = null; rejectWorker.current?.(abortError()); rejectWorker.current = null; archiveController.current?.abort(); };
  }, []);
  useEffect(() => { setSettings(current => ({ ...current, mode })); }, [mode]);

  const addFiles = useCallback((incoming: File[]) => {
    if (busyRef.current) return;
    const seen = new Set(itemsRef.current.map(item => duplicateKey(item.file)));
    const additions: QueueItem[] = [];
    let duplicates = 0, rejected = 0;
    for (const file of incoming) {
      const key = duplicateKey(file);
      if (seen.has(key)) { duplicates++; continue; }
      if (!/\.(png|jpe?g|webp)$/i.test(file.name) && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) { rejected++; continue; }
      if (file.size > LIMITS.fileBytes || !file.size || itemsRef.current.length + additions.length >= LIMITS.files) { rejected++; continue; }
      seen.add(key);
      additions.push({ id: crypto.randomUUID(), file, status: "ready", progress: 0, phase: "Ready" });
    }
    update(current => [...current, ...additions]);
    if (additions[0]) select(additions[0].id);
    setError(rejected ? `${rejected} file${rejected === 1 ? " was" : "s were"} skipped. Use static PNG, JPEG or WebP, up to 32 MB each and 24 files per batch.` : "");
    setMessage(`${additions.length} file${additions.length === 1 ? "" : "s"} added${duplicates ? ` · ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped` : ""}.`);
  }, [update]);

  const process = (item: QueueItem, snapshot: ScaleSettings, token: number) => new Promise<ScaleResult>((resolve, reject) => {
    const current = new Worker(new URL("./scale.worker.ts", import.meta.url), { type: "module" });
    worker.current = current;
    const timeout = setTimeout(() => finish(new Error("The browser took too long to resize this image. Try a smaller source or scale factor.")), 180_000);
    function finish(reason?: Error, result?: ScaleResult) {
      clearTimeout(timeout); current.terminate();
      if (worker.current === current) { worker.current = null; rejectWorker.current = null; }
      if (reason) reject(reason); else if (result) resolve(result);
    }
    rejectWorker.current = reason => finish(reason);
    current.onerror = event => { event.preventDefault(); finish(new Error("The image worker stopped. Try a smaller source or scale factor, then retry.")); };
    current.onmessageerror = () => finish(new Error("The browser could not transfer this image. Try again with a smaller file."));
    current.onmessage = (event: MessageEvent<WorkerReply>) => {
      if (token !== generation.current) return finish(abortError());
      const data = event.data;
      if (data.kind === "progress") update(list => list.map(entry => entry.id === item.id ? { ...entry, progress: data.progress, phase: data.phase } : entry));
      if (data.kind === "error") finish(new Error(data.message));
      if (data.kind === "result") finish(undefined, data.result);
    };
    current.postMessage({ id: token, kind: "scale", file: item.file, settings: snapshot });
  });

  const run = async (onlyId?: string) => {
    if (busyRef.current) return;
    const snapshot: ScaleSettings = { ...settings, mode };
    const targets = itemsRef.current.filter(item => (!onlyId || item.id === onlyId) && (item.status !== "done" || !item.result || signature(item.result.settings) !== signature(snapshot)));
    if (!targets.length) { setMessage("Your PNG files already use these settings."); return; }
    const token = ++generation.current;
    busyRef.current = true; setBusy(true); setError(""); setMessage(`Processing ${targets.length} image${targets.length === 1 ? "" : "s"}…`);
    let completed = 0, failed = 0;
    try {
      for (const item of targets) {
        if (generation.current !== token) break;
        update(list => list.map(entry => entry.id === item.id ? { ...entry, status: "working", phase: "Preparing", progress: 0, error: undefined, result: undefined } : entry));
        try {
          const result = await process(item, snapshot, token);
          if (generation.current !== token) break;
          const existing = itemsRef.current.reduce((sum, entry) => sum + (entry.result?.outputs.reduce((bytes, output) => bytes + output.blob.size, 0) ?? 0), 0);
          const incoming = result.outputs.reduce((sum, output) => sum + output.blob.size, 0);
          if (existing + incoming > LIMITS.retainedBytes) throw new Error("This batch exceeds the 96 MB output budget. Download and remove completed files, then retry this image.");
          update(list => list.map(entry => entry.id === item.id ? { ...entry, result, status: "done", phase: "Ready to download", progress: 1 } : entry));
          completed++;
        } catch (cause) {
          if (generation.current !== token) break;
          failed++;
          update(list => list.map(entry => entry.id === item.id ? { ...entry, status: "error", phase: "Needs attention", error: cause instanceof Error ? cause.message : "Image processing failed." } : entry));
        }
      }
      if (generation.current === token && mounted.current) setMessage(`${completed} image${completed === 1 ? "" : "s"} ready${failed ? ` · ${failed} need attention` : ""}.`);
    } finally { if (generation.current === token) { busyRef.current = false; if (mounted.current) setBusy(false); } }
  };

  const cancel = () => {
    generation.current++; worker.current?.terminate(); rejectWorker.current?.(abortError()); archiveController.current?.abort();
    worker.current = null; rejectWorker.current = null; busyRef.current = false; setBusy(false);
    update(list => list.map(item => item.status === "working" ? { ...item, status: "cancelled", phase: "Cancelled", progress: 0 } : item));
    setMessage("Cancelled. Completed downloads remain available.");
  };

  const remove = (id: string) => { if (busyRef.current) return; update(list => list.filter(item => item.id !== id)); if (selectedId === id) select(itemsRef.current[0]?.id ?? null); };
  const clear = () => { if (busyRef.current) return; update(() => []); select(null); setMessage(""); setError(""); };
  const save = (id: string, index: number) => { const output = itemsRef.current.find(item => item.id === id)?.result?.outputs[index]; if (output) downloadBlob(output.blob, output.name); };
  const saveAll = async () => {
    if (busyRef.current) return;
    const ready = itemsRef.current.filter(item => item.result);
    if (!ready.length) return;
    const total = ready.reduce((sum, item) => sum + item.result!.outputs.reduce((size, output) => size + output.blob.size, 0), 0);
    if (total > LIMITS.zipBytes) { setError("ZIP downloads are limited to 96 MB. Download individual PNGs instead."); return; }
    const token = ++generation.current;
    const controller = new AbortController(); archiveController.current = controller;
    busyRef.current = true; setBusy(true); setError(""); setMessage("Preparing ZIP…");
    const names = new Set<string>(["manifest.json"]);
    const entries: { name: string; blob: Blob }[] = [];
    const images = ready.map(item => ({
      source: { name: item.file.name, bytes: item.file.size, ...item.result!.source },
      settings: item.result!.settings,
      outputs: item.result!.outputs.map(output => {
        let name = output.name, suffix = 2;
        while (names.has(name.toLocaleLowerCase("en-US"))) name = output.name.replace(/\.png$/, `-${suffix++}.png`);
        names.add(name.toLocaleLowerCase("en-US")); entries.push({ name, blob: output.blob });
        return { name, width: output.width, height: output.height, bytes: output.blob.size, density: output.density, factor: output.factor };
      }),
    }));
    entries.push({ name: "manifest.json", blob: new Blob([JSON.stringify({ version: 1, tool: "Game Asset Toolkit", images }, null, 2)], { type: "application/json" }) });
    try {
      const zip = await createZip(entries, controller.signal, (done, count) => { if (mounted.current && generation.current === token) setMessage(`Preparing ZIP · ${done}/${count} files`); });
      if (generation.current !== token) return;
      downloadBlob(zip, mode === "pixel" ? "pixel-art-scaled.zip" : "image-density-set.zip");
      setMessage("ZIP ready. Includes exact dimensions, byte sizes and settings in manifest.json.");
    } catch (cause) { if (generation.current === token) setError(cause instanceof Error ? cause.message : "Could not create the ZIP."); }
    finally { if (generation.current === token) { busyRef.current = false; archiveController.current = null; if (mounted.current) setBusy(false); } }
  };

  return { items, selectedId, select, settings, setSettings, busy, message, error, addFiles, run, cancel, remove, clear, save, saveAll };
}
