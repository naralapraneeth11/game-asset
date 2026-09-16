"use client";

import { memo, useId, useMemo, type ReactNode } from "react";
import { formatBytes } from "@/lib/dev/browser";
import s from "./dev.module.css";

export const CodeEditor = memo(function CodeEditor({ label = "Code", value, onChange, readOnly = false, placeholder = "", description, error, minHeight, maxLength = 10 * 1024 * 1024, actions, rows, spellCheck = false, className = "" }: { label?: string; value: string; onChange?: (value: string) => void; readOnly?: boolean; placeholder?: string; description?: string; error?: string; minHeight?: number; maxLength?: number; actions?: ReactNode; rows?: number; spellCheck?: boolean; className?: string }) {
  const id = useId();
  const bytes = useMemo(() => new TextEncoder().encode(value).byteLength, [value]);
  const lines = useMemo(() => { let count = 1; for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) === 10) count++; return count; }, [value]);
  return <div className={s.panel}><div className={s.panelHeader}><label htmlFor={id}>{label}</label>{actions}</div><textarea id={id} className={`${s.editor} ${className}`} rows={rows} style={minHeight ? { minHeight } : rows ? { minHeight: 0 } : undefined} value={value} onChange={(event) => onChange?.(event.target.value)} readOnly={readOnly || !onChange} placeholder={placeholder} spellCheck={spellCheck} autoCorrect="off" autoCapitalize="off" autoComplete="off" data-gramm="false" data-gramm_editor="false" aria-invalid={!!error} aria-describedby={`${id}-detail`} maxLength={maxLength} wrap="soft" /><div className={s.editorFooter}><span>{value.length.toLocaleString("en-US")} characters · {formatBytes(bytes)} · {lines.toLocaleString("en-US")} {lines === 1 ? "line" : "lines"}</span><span id={`${id}-detail`} className={error ? s.error : undefined}>{error || description || (readOnly ? "Read only · Select to copy" : "UTF-8 · Tab moves to the next control")}</span></div></div>;
});
