"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createZip, downloadBlob } from "@/tools/local-files/download";
import { GIF_DEFAULTS, SPLIT_DEFAULTS, type GifOptions, type Progress, type SplitOptions, type SpriteInfo, type SpriteMode, type SpriteResult, type WorkerReply, type WorkerRequest } from "./types";

export function useSpriteUtilities(mode: SpriteMode) {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<SpriteInfo | null>(null);
  const [gif, setGifState] = useState<GifOptions>(GIF_DEFAULTS);
  const [split, setSplitState] = useState<SplitOptions>(SPLIT_DEFAULTS);
  const [result, setResult] = useState<SpriteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>({ value: 0, label: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const worker = useRef<Worker | null>(null);
  const zip = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const alive = useRef(true);

  const stop = useCallback(() => {
    generation.current++;
    worker.current?.terminate(); worker.current = null;
    zip.current?.abort(); zip.current = null;
  }, []);

  useEffect(() => { alive.current = true; return () => { alive.current = false; stop(); }; }, [stop]);

  const cancel = useCallback(() => {
    stop(); setBusy(false); setProgress({ value: 0, label: "" }); setMessage("Cancelled. Your original file is unchanged.");
  }, [stop]);

  const clear = useCallback(() => {
    stop(); setFile(null); setInfo(null); setResult(null); setBusy(false); setError(""); setMessage(""); setProgress({ value: 0, label: "" });
  }, [stop]);

  const dispatch = useCallback((request: WorkerRequest) => {
    stop();
    const id = generation.current;
    setBusy(true); setError(""); setMessage(""); setResult(null);
    setProgress({ value: 0, label: request.action === "inspect" ? "Reading your file" : "Preparing export" });
    try {
      const next = new Worker(new URL("./sprites.worker.ts", import.meta.url), { type: "module" });
      worker.current = next;
      const fail = (message: string) => {
        if (!alive.current || generation.current !== id) return;
        next.terminate(); worker.current = null; setBusy(false); setError(message);
      };
      next.onerror = event => { event.preventDefault(); fail("The image worker stopped. Try a smaller image or reload the page. If this happens for every file, confirm the worker assets deployed correctly."); };
      next.onmessageerror = () => fail("The browser could not read the worker response. Reload the page and try again.");
      next.onmessage = (event: MessageEvent<WorkerReply>) => {
        if (!alive.current || generation.current !== id || event.data.id !== id) return;
        const reply = event.data;
        if (reply.kind === "progress") { setProgress(reply.progress); return; }
        next.terminate(); worker.current = null; setBusy(false);
        if (reply.kind === "error") { setError(reply.message); return; }
        if (reply.kind === "info") {
          setInfo(reply.info); setMessage("File attached and ready."); setProgress({ value: 0, label: "" });
          if (mode === "split") {
            // Choose an exact default grid; never silently crop a sheet to force 4 × 4.
            setSplitState({ ...SPLIT_DEFAULTS, columns: reply.info.width % 4 === 0 ? 4 : 1, rows: reply.info.height % 4 === 0 ? 4 : 1 });
          }
        } else { setResult(reply.result); setProgress({ value: 1, label: "Export ready" }); setMessage(reply.result.summary); }
      };
      next.postMessage({ ...request, id });
    } catch (error) {
      worker.current?.terminate(); worker.current = null; setBusy(false); setError(error instanceof Error ? error.message : "Your browser could not start the image worker.");
    }
  }, [mode, stop]);

  const addFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    setFile(files[0]); setInfo(null); setGifState(GIF_DEFAULTS); setSplitState(SPLIT_DEFAULTS);
    dispatch({ id: 0, action: "inspect", mode, file: files[0] });
  }, [dispatch, mode]);

  const setGif = useCallback((next: GifOptions) => { setGifState(next); setResult(null); setMessage(""); setError(""); }, []);
  const setSplit = useCallback((next: SplitOptions) => { setSplitState(next); setResult(null); setMessage(""); setError(""); }, []);
  const run = useCallback(() => {
    if (!file || !info || busy) return;
    dispatch(mode === "gif" ? { id: 0, action: "gif", file, options: gif } : { id: 0, action: "split", file, options: split });
  }, [file, info, busy, dispatch, mode, gif, split]);

  const downloadAll = useCallback(async () => {
    if (!result || busy) return;
    stop();
    const id = generation.current;
    const controller = new AbortController(); zip.current = controller;
    setBusy(true); setError(""); setProgress({ value: 0, label: "Preparing ZIP" });
    try {
      const blob = await createZip(result.files, controller.signal, (done, total) => {
        if (alive.current && id === generation.current) setProgress({ value: total ? done / total : 0, label: `Adding file ${done} of ${total} to ZIP` });
      });
      if (alive.current && id === generation.current && !controller.signal.aborted) { downloadBlob(blob, result.zipName); setMessage("ZIP ready. Your browser handles the download."); }
    } catch (error) {
      if (alive.current && id === generation.current && !controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not create the ZIP. Download files individually instead.");
    } finally {
      if (alive.current && id === generation.current) { setBusy(false); zip.current = null; setProgress({ value: 1, label: "Export ready" }); }
    }
  }, [result, busy, stop]);

  return { file, info, gif, setGif, split, setSplit, result, busy, progress, error, message, addFiles, run, cancel, clear, downloadAll };
}
