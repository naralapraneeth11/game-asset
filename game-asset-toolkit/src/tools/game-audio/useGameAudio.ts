"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createZip, downloadBlob } from "@/tools/local-files/download";
import { AudioWorkerClient } from "./engine/client";
import { AUDIO_LIMITS, DEFAULT_SETTINGS, type AudioItem, type AudioSettings } from "./types";

export function useGameAudio() {
  const [items, setItems] = useState<AudioItem[]>([]);
  const itemsRef = useRef<AudioItem[]>([]);
  const [settings, setSettings] = useState<AudioSettings>({ ...DEFAULT_SETTINGS });
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [zipBusy, setZipBusy] = useState(false);
  const zipController = useRef<AbortController | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const client = useRef<AudioWorkerClient | null>(null);
  const version = useRef(0);
  const mounted = useRef(false);

  const replace = useCallback((next: AudioItem[]) => { itemsRef.current = next; if (mounted.current) setItems(next); }, []);
  const patch = useCallback((id: string, values: Partial<AudioItem>) => replace(itemsRef.current.map((item) => item.id === id ? { ...item, ...values } : item)), [replace]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; version.current++; client.current?.cancel(); zipController.current?.abort(); itemsRef.current = []; };
  }, []);
  useEffect(() => {
    if (!busy) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [busy]);

  const addFiles = (files: File[]) => {
    if (busyRef.current) return;
    const next = [...itemsRef.current];
    let added = 0, duplicates = 0;
    const rejected: string[] = [];
    for (const file of files) {
      if (next.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) { duplicates++; continue; }
      if (next.length >= AUDIO_LIMITS.queue) { rejected.push("The queue holds up to 20 files."); break; }
      if (!/\.(wav|wave|mp3|ogg|oga|opus|aac|m4a|flac|aiff|aif)$/i.test(file.name) && !file.type.startsWith("audio/")) { rejected.push(`${file.name}: choose an audio file.`); continue; }
      if (!file.size || file.size > AUDIO_LIMITS.input) { rejected.push(`${file.name}: choose a non-empty file under 256 MiB.`); continue; }
      next.push({ id: crypto.randomUUID(), file, status: "ready", phase: "Ready to convert", progress: null }); added++;
    }
    replace(next);
    setError(rejected.slice(0, 3).join(" "));
    setNotice(`${added ? `${added} file${added === 1 ? "" : "s"} added.` : "No new files added."}${duplicates ? ` ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped.` : ""}`);
  };

  const cancel = useCallback(() => {
    version.current++; client.current?.cancel(); client.current = null;
    busyRef.current = false; setBusy(false);
    replace(itemsRef.current.map((item) => item.status === "processing" ? { ...item, status: "cancelled", phase: "Cancelled", progress: null } : item));
    setNotice("Conversion cancelled. Completed files are still available.");
  }, [replace]);

  const convertAll = async () => {
    if (busyRef.current || !itemsRef.current.length || zipController.current) return;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    const run = ++version.current;
    const options = { ...settings };
    const jobs = itemsRef.current.map(({ id, file }) => ({ id, file }));
    const worker = client.current ??= new AudioWorkerClient();
    let complete = 0, failed = 0;
    try {
      for (const job of jobs) {
        if (run !== version.current) break;
        patch(job.id, { status: "processing", phase: "Preparing audio", progress: null, result: undefined, error: undefined });
        try {
          const result = await worker.convert(job.file, options, (phase, progress) => { if (run === version.current) patch(job.id, { phase, progress }); });
          if (run !== version.current) break;
          const retained = itemsRef.current.reduce((total, item) => total + (item.result?.blob.size ?? 0), 0);
          if (retained + result.blob.size > AUDIO_LIMITS.retained) throw new Error("Completed files reached the 256 MiB session budget. Download and remove some results, then convert the remaining files.");
          patch(job.id, { status: "done", phase: "Ready to download", progress: 1, result }); complete++;
        } catch (cause) {
          if (run !== version.current) break;
          patch(job.id, { status: "error", phase: "Needs attention", progress: null, error: cause instanceof Error ? cause.message : "Audio conversion failed." }); failed++;
        }
      }
      if (run === version.current) setNotice(`${complete} file${complete === 1 ? "" : "s"} converted.${failed ? ` ${failed} could not be converted; see the file queue.` : ""}`);
    } finally {
      if (mounted.current && run === version.current) { busyRef.current = false; setBusy(false); }
    }
  };

  const remove = (id: string) => { if (!busyRef.current && !zipController.current) replace(itemsRef.current.filter((item) => item.id !== id)); };
  const clear = () => { if (!busyRef.current && !zipController.current) { replace([]); setNotice("Files cleared from this tool."); setError(""); client.current?.cancel(); client.current = null; } };
  const downloadAll = async () => {
    if (busyRef.current || zipController.current) return;
    const files = itemsRef.current.flatMap((item) => item.result ? [{ name: item.result.name, blob: item.result.blob }] : []);
    if (!files.length) return;
    const controller = new AbortController(); zipController.current = controller; setZipBusy(true); setError("");
    try {
      const blob = await createZip(files, controller.signal, (done, total) => { if (mounted.current) setNotice(`Preparing ZIP: ${done} of ${total} files.`); });
      if (mounted.current && !controller.signal.aborted) { downloadBlob(blob, "game-audio-ogg.zip"); setNotice("ZIP download started."); }
    } catch (cause) { if (mounted.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "The ZIP could not be created. Download each file separately."); }
    finally { zipController.current = null; if (mounted.current) setZipBusy(false); }
  };

  return { items, settings, setSettings, busy, zipBusy, notice, error, addFiles, convertAll, cancel, clear, remove, downloadAll };
}
