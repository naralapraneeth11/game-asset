"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { errorMessage, formatBytes } from "@/lib/dev/browser";
import { Button } from "./Button";
import { Notice } from "./Controls";
import s from "./dev.module.css";

export function FileDropzone({ onFile, accept, maxBytes = 10 * 1024 * 1024, label = "Open a file", description, onError }: { onFile: (file: File) => void | Promise<void>; accept?: string; maxBytes?: number; label?: string; description?: string; onError?: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const operation = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  useEffect(() => () => { operation.current++; }, []);
  async function take(files: FileList | null) {
    if (!files?.length) return;
    const generation = ++operation.current;
    setError("");
    try {
      if (files.length !== 1) throw new Error("Choose one file at a time.");
      const file = files[0];
      if (file.size > maxBytes) throw new Error(`This tool accepts files up to ${formatBytes(maxBytes)}. Selected file: ${formatBytes(file.size)}.`);
      setBusy(true);
      await onFile(file);
      if (operation.current === generation) setName(`${file.name} · ${formatBytes(file.size)}`);
    } catch (cause) { if (operation.current === generation) { const message = errorMessage(cause); setError(message); onError?.(message); } }
    finally { if (operation.current === generation) setBusy(false); }
  }
  return <div className={s.stack} style={{ gap: 8 }}><div className={s.dropzone} data-dragging={dragging} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) void take(event.dataTransfer.files); }}><FileUp size={20} aria-hidden /><div className={s.dropInfo}><strong>{label}</strong><span role="status">{busy ? "Reading locally…" : name || description || `Drop a file here · Up to ${formatBytes(maxBytes)}`}</span></div><Button onClick={() => input.current?.click()} disabled={busy}>{busy ? "Reading…" : "Choose file"}</Button><input ref={input} type="file" accept={accept} className={s.srOnly} tabIndex={-1} aria-label={label} onChange={(event) => { void take(event.target.files); event.target.value = ""; }} /></div>{error && <Notice tone="error">{error}</Notice>}</div>;
}

