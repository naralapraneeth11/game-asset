"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { proxy, releaseProxy, wrap, type Remote } from "comlink";
import { DEFAULT_SETTINGS, LIMITS, type CapabilityReport, type ExportRequest, type ExportResult, type ProgressUpdate, type QueueItem, type VideoSettings } from "./types";
import type { VideoEngine } from "./engine/video.worker";
import { errorText } from "./engine/shared";

type Bridge = { worker: Worker; api: Remote<VideoEngine>; failed: Promise<never>; dead: boolean; destroy: (reason: Error) => void };
const freshSettings = (): VideoSettings => ({ ...DEFAULT_SETTINGS, crop: { ...DEFAULT_SETTINGS.crop } });
const keyOf = (file: File) => `${file.name}\0${file.size}\0${file.lastModified}`;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.style.display = "none";
  document.body.append(anchor); anchor.click(); anchor.remove();
  // Keep disk-backed File snapshots alive while the browser starts the download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function useVideoEditor() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<VideoSettings>(freshSettings);
  const [watermark, setWatermark] = useState<File | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const rows = useRef<QueueItem[]>([]);
  const bridge = useRef<Bridge | null>(null);
  const mounted = useRef(false);
  const occupied = useRef(false);
  const cancelled = useRef(false);
  const lifecycle = useRef(0);
  const activeWorkspace = useRef<string | null>(null);
  const selectRef = useRef<string | null>(null);
  selectRef.current = selectedId;

  const change = useCallback((update: (current: QueueItem[]) => QueueItem[]) => {
    rows.current = update(rows.current);
    if (mounted.current) setItems(rows.current);
  }, []);
  const patch = useCallback((id: string, update: Partial<QueueItem>) => change((current) => current.map((item) => item.id === id ? { ...item, ...update } : item)), [change]);

  const connect = useCallback((): Bridge => {
    if (bridge.current && !bridge.current.dead) return bridge.current;
    if (typeof Worker === "undefined") throw new Error("This browser does not support workers. Use a current desktop browser.");
    const worker = new Worker(new URL("./engine/video.worker.ts", import.meta.url), { type: "module", name: "game-asset-video" });
    let rejectFailure!: (reason: Error) => void;
    const failed = new Promise<never>((_, reject) => { rejectFailure = reject; });
    // Startup failures can occur before the first operation subscribes to this promise.
    void failed.catch(() => undefined);
    const value: Bridge = { worker, api: wrap<VideoEngine>(worker), failed, dead: false, destroy(reason) { value.dead = true; rejectFailure(reason); worker.terminate(); } };
    worker.addEventListener("error", (event) => {
      event.preventDefault();
      const reason = new Error("The video worker stopped. Check that video assets were prepared, reload, or use a smaller source. Your original file is unchanged.");
      value.destroy(reason);
      if (mounted.current && bridge.current === value) setError(reason.message);
    });
    worker.addEventListener("messageerror", () => value.destroy(new Error("The browser could not exchange data with the video worker. Reload and try again.")));
    bridge.current = value;
    return value;
  }, []);

  const call = useCallback(<T,>(operation: (api: Remote<VideoEngine>) => Promise<T>): Promise<T> => {
    if (!mounted.current) return Promise.reject(new Error("The video editor was closed."));
    const value = connect();
    return Promise.race([operation(value.api), value.failed]);
  }, [connect]);

  useEffect(() => {
    mounted.current = true;
    const version = ++lifecycle.current;
    let value: Bridge;
    try {
      value = connect();
      void Promise.race([value.api.audit(), value.failed]).then((report) => { if (mounted.current && lifecycle.current === version) setCapabilities(report); }).catch((failure: unknown) => { if (mounted.current && lifecycle.current === version) setError(errorText(failure)); });
    } catch (failure) { setError(errorText(failure)); }
    return () => {
      mounted.current = false; lifecycle.current++; cancelled.current = true;
      const previous = bridge.current; bridge.current = null;
      if (previous) {
        const diskIds = [...rows.current.flatMap((row) => row.result?.workspaceId ? [row.result.workspaceId] : []), ...(activeWorkspace.current ? [activeWorkspace.current] : [])];
        const destroy = () => {
          previous.destroy(new Error("The video editor was closed."));
          // Clean only this tab's known temporary outputs, including a interrupted job.
          void (async () => {
            if (!navigator.storage?.getDirectory) return;
            const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle("game-asset-toolkit-video-v1");
            await Promise.allSettled(diskIds.map((id) => directory.removeEntry(id, { recursive: true })));
          })().catch(() => undefined);
        };
        const timeout = setTimeout(destroy, 5_000);
        void Promise.race([previous.api.dispose(), previous.failed]).catch(() => undefined).finally(() => { clearTimeout(timeout); previous.api[releaseProxy](); destroy(); });
      }
    };
  }, [connect]);

  useEffect(() => {
    if (!busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [busy]);

  const select = useCallback((id: string) => { selectRef.current = id; setSelectedId(id); }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    if (occupied.current) throw new Error("Finish or cancel the current operation before adding files.");
    const version = lifecycle.current;
    setError("");
    const existing = new Set(rows.current.map((item) => keyOf(item.file)));
    const added: QueueItem[] = [];
    let duplicates = 0, skipped = 0;
    for (const file of Array.from(files)) {
      if (existing.has(keyOf(file))) { duplicates++; continue; }
      if (rows.current.length + added.length >= LIMITS.queue) { skipped++; continue; }
      existing.add(keyOf(file));
      const problem = !file.size ? "This file is empty." : file.size > LIMITS.nativeInput ? "Choose a source smaller than 8 GiB." : null;
      added.push({ id: crypto.randomUUID(), file, status: problem ? "error" : "reading", phase: problem ? "Cannot read" : "Reading video", progress: null, ...(problem ? { error: problem } : {}) });
    }
    change((current) => [...current, ...added]);
    if (!selectRef.current && added[0]) select(added[0].id);
    const notice = `${added.length} ${added.length === 1 ? "file added" : "files added"}${duplicates ? ` · ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped` : ""}${skipped ? ` · ${skipped} skipped (20-file limit)` : ""}.`;
    setMessage(notice);
    for (const item of added) {
      if (version !== lifecycle.current || !rows.current.some((row) => row.id === item.id) || item.status === "error") continue;
      try {
        const info = await call((api) => api.probe(item.file));
        if (version === lifecycle.current) patch(item.id, { info, status: "ready", phase: "Ready", progress: null, error: undefined });
      } catch (failure) {
        if (version === lifecycle.current) patch(item.id, { status: "error", phase: "Needs attention", error: errorText(failure), progress: null });
      }
    }
  }, [call, change, patch, select]);

  const release = useCallback(async (result?: ExportResult) => {
    if (result?.workspaceId) await call((api) => api.release(result.workspaceId!));
  }, [call]);

  const remove = useCallback((id: string) => {
    if (occupied.current) return;
    const item = rows.current.find((row) => row.id === id);
    change((current) => current.filter((row) => row.id !== id));
    if (selectRef.current === id) select(rows.current[0]?.id || "");
    void release(item?.result).catch((failure: unknown) => setError(`File removed, but temporary disk cleanup failed: ${errorText(failure)}`));
  }, [change, release, select]);

  const clear = useCallback(async () => {
    if (occupied.current) throw new Error("Cancel the current operation before clearing files.");
    occupied.current = true; setBusy(true);
    const previous = rows.current;
    try {
      change(() => []); setSelectedId(null); selectRef.current = null; setWatermark(null); setError("");
      await call((api) => api.cancel());
      for (const row of previous) await release(row.result);
      await call((api) => api.clear());
      if (mounted.current) setMessage("Files and temporary outputs cleared.");
    } finally { occupied.current = false; if (mounted.current) setBusy(false); }
  }, [call, change, release]);

  const process = useCallback(async (ids: string[]) => {
    if (occupied.current) return;
    const batch = rows.current.filter((row) => ids.includes(row.id) && row.info);
    if (!batch.length) throw new Error("Add a readable video first.");
    occupied.current = true; cancelled.current = false; setBusy(true); setError("");
    const version = lifecycle.current;
    const options = structuredClone(settings);
    let completed = 0, failures = 0;
    let wake: WakeLockSentinel | undefined;
    try {
      try { wake = await navigator.wakeLock?.request("screen"); } catch { /* Browser may decline; export still works. */ }
      for (const row of batch) {
        if (cancelled.current || version !== lifecycle.current) break;
        const id = crypto.randomUUID(); activeWorkspace.current = id;
        patch(row.id, { status: "processing", phase: "Checking codecs", progress: null, error: undefined });
        setMessage(`Exporting ${completed + failures + 1} of ${batch.length}: ${row.file.name}`);
        const request: ExportRequest = { id, file: row.file, info: row.info!, settings: options, watermark };
        const progress = proxy((update: ProgressUpdate) => {
          if (version !== lifecycle.current || cancelled.current) return;
          patch(row.id, { phase: update.phase, progress: update.progress });
          if (update.detail) setMessage(update.detail);
        });
        try {
          const result = await call((api) => api.run(request, progress));
          if (cancelled.current || version !== lifecycle.current) { await release(result); break; }
          const retained = rows.current.reduce((sum, item) => sum + (item.id !== row.id && item.result && !item.result.workspaceId ? item.result.blob.size : 0), 0);
          if (!result.workspaceId && retained + result.blob.size > LIMITS.batchZip) {
            throw new Error("Retained exports reached the 256 MiB memory budget. Save and remove some completed files before continuing.");
          }
          await release(row.result);
          patch(row.id, { result, status: "done", progress: 1, phase: "Ready to save" });
          completed++;
        } catch (failure) {
          if (version !== lifecycle.current) break;
          const stopped = cancelled.current;
          patch(row.id, { status: stopped ? "cancelled" : "error", progress: null, phase: stopped ? "Cancelled" : "Export failed", error: stopped ? undefined : errorText(failure) });
          if (!stopped) { failures++; setError(errorText(failure)); }
          // Also removes an abandoned native workspace after a crashed worker.
          await call((api) => api.release(id)).catch(() => undefined);
        } finally { activeWorkspace.current = null; }
      }
      if (version === lifecycle.current) setMessage(cancelled.current ? "Export cancelled. Completed files are still available." : `${completed} ${completed === 1 ? "export" : "exports"} ready to save${failures ? ` · ${failures} failed; details are shown with each file` : ""}.`);
    } finally {
      await wake?.release().catch(() => undefined);
      occupied.current = false;
      if (mounted.current && version === lifecycle.current) setBusy(false);
    }
  }, [call, patch, release, settings, watermark]);

  const cancel = useCallback(() => {
    cancelled.current = true; setMessage("Stopping and cleaning up…");
    void call((api) => api.cancel()).catch((failure: unknown) => { if (mounted.current) setError(errorText(failure)); });
  }, [call]);

  const save = useCallback((id: string) => {
    const result = rows.current.find((row) => row.id === id)?.result;
    if (result) download(result.blob, result.filename);
  }, []);

  const saveAll = useCallback(async () => {
    if (occupied.current) return;
    const version = lifecycle.current;
    const results = rows.current.flatMap((row) => row.result ? [row.result] : []);
    if (!results.length) throw new Error("No exported files are ready.");
    occupied.current = true; cancelled.current = false; setBusy(true); setError(""); setMessage("Preparing ZIP on your device…");
    try {
      const blob = await call((api) => api.zip(results.map(({ blob, filename }) => ({ blob, filename }))));
      if (!cancelled.current && mounted.current && version === lifecycle.current) { download(blob, "game-asset-videos.zip"); setMessage("ZIP ready to save."); }
    } finally { occupied.current = false; if (mounted.current) setBusy(false); }
  }, [call]);

  const share = useCallback(async (id: string) => {
    const result = rows.current.find((row) => row.id === id)?.result;
    if (!result) throw new Error("Export this file first.");
    const files = [new File([result.blob], result.filename, { type: result.blob.type })];
    if (!navigator.canShare?.({ files }) || !navigator.share) throw new Error("File sharing is unavailable in this browser. Use Save instead.");
    try { await navigator.share({ files }); } catch (failure) { if (!(failure instanceof DOMException && failure.name === "AbortError")) throw failure; }
  }, []);

  const snapshot = useCallback(async (format: "png" | "jpeg", time: number) => {
    if (occupied.current) return;
    const version = lifecycle.current;
    const row = rows.current.find((item) => item.id === selectRef.current);
    if (!row?.info) throw new Error("Select a readable video first.");
    occupied.current = true; cancelled.current = false; setBusy(true); setError(""); setMessage("Rendering current frame…");
    try {
      const blob = await call((api) => api.snapshot(row.file, row.info!, settings, watermark, format, time));
      if (!cancelled.current && mounted.current && version === lifecycle.current) { download(blob, `${row.file.name.replace(/\.[^.]+$/, "")}_frame.${format === "jpeg" ? "jpg" : "png"}`); setMessage("Frame ready to save."); }
    } finally { occupied.current = false; if (mounted.current) setBusy(false); }
  }, [call, settings, watermark]);

  const exportSelected = useCallback(() => process(selectRef.current ? [selectRef.current] : []), [process]);
  const exportAll = useCallback(() => process(rows.current.filter((row) => row.info).map((row) => row.id)), [process]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void exportSelected().catch((failure: unknown) => setError(errorText(failure))); }
      if (event.key === "Escape" && occupied.current) { event.preventDefault(); cancel(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel, exportSelected]);

  return { items, selectedId, select, settings, setSettings: setSettings as Dispatch<SetStateAction<VideoSettings>>, watermark, setWatermark, capabilities, busy, message, error, addFiles, remove, clear, exportAll, exportSelected, cancel, save, saveAll, share, snapshot };
}
