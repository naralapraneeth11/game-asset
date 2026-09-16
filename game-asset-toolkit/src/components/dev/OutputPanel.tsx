"use client";

import { useMemo, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";
import { download, formatBytes } from "@/lib/dev/browser";
import { Button } from "./Button";
import { CopyButton } from "./CopyButton";
import s from "./dev.module.css";

function JsonHighlight({ value }: { value: string }) {
  const nodes = useMemo(() => {
    if (value.length > 100_000) return value;
    const expression = /"(?:\\[\s\S]|[^"\\])*"(?=\s*:)|"(?:\\[\s\S]|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g;
    const parts: ReactNode[] = [];
    let start = 0;
    let match: RegExpExecArray | null;
    while ((match = expression.exec(value))) {
      if (match.index > start) parts.push(value.slice(start, match.index));
      const token = match[0];
      const next = value.slice(expression.lastIndex).match(/^\s*:/);
      const kind = token[0] === '"' ? (next ? s.tokenKey : s.tokenString) : /^-?\d/.test(token) ? s.tokenNumber : s.tokenLiteral;
      parts.push(<span className={kind} key={match.index}>{token}</span>);
      start = expression.lastIndex;
    }
    if (start < value.length) parts.push(value.slice(start));
    return parts;
  }, [value]);
  return <pre className={s.syntax} tabIndex={0} aria-label="JSON output"><code>{nodes}</code></pre>;
}

export interface OutputPanelProps { label?: string; title?: string; value?: string; filename?: string; language?: "json" | "text"; children?: ReactNode; busy?: boolean; className?: string; emptyMessage?: string; isEmpty?: boolean; }

export function OutputPanel({ label, title, value = "", filename = "result.txt", language = "text", children, busy = false, className = "", emptyMessage = "Result will appear here", isEmpty = false }: OutputPanelProps) {
  const heading = label ?? title ?? "Result";
  return <div className={`${s.stack} ${className}`} style={{ gap: 10 }}><div className={s.panel} aria-busy={busy}><div className={s.panelHeader}><span className={s.row}>{busy && <Loader2 size={13} aria-hidden />}{heading}</span><div className={s.actions}><CopyButton text={value} label={`Copy ${heading.toLowerCase()}`} disabled={busy || !value} /><Button disabled={busy || !value} onClick={() => download(value, filename)} aria-label={`Download ${heading.toLowerCase()}`}><Download size={13} aria-hidden /><span className={s.srOnly}>Download</span></Button></div></div>{(isEmpty ? <p className={`${s.panelBody} ${s.muted}`}>{emptyMessage}</p> : children) || (language === "json" && value ? <JsonHighlight value={value} /> : <textarea className={s.editor} aria-label={heading} readOnly value={busy ? "" : value} placeholder={busy ? "Processing on your device…" : "Your result will appear here."} spellCheck={false} />)}<div className={s.editorFooter}><span>{busy ? "Processing…" : value ? `${formatBytes(new TextEncoder().encode(value).byteLength)} · Ready to copy or download` : "Waiting for input"}</span>{value.length > 100_000 && language === "json" && <span>Highlighting paused for large output</span>}</div></div></div>;
}
