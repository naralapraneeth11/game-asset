"use client";

import type { ReactNode } from "react";
import { allTools } from "@/lib/tools";
import s from "./dev.module.css";

export interface ToolShellProps { toolId?: string; title?: string; children: ReactNode; actions?: ReactNode; onClear?: () => void; onProcess?: () => void; className?: string; }

/**
 * Workspace for the developer tools. The page header, how-to, FAQ and related
 * tools come from ToolPage; this adds the shared toolbar and shortcuts.
 */
export function ToolShell({ toolId, title, children, actions, onClear, onProcess, className = "" }: ToolShellProps) {
  const tool = allTools.find((item) => item.id === toolId);
  const shortcuts = [onProcess && "⌘ / Ctrl + Enter to run", onClear && "Esc to clear"].filter(Boolean).join(" · ");
  return <section className={`${s.shell} ${className}`} aria-label={title || tool?.name || "Developer tool"} onKeyDown={(event) => {
    if (event.nativeEvent.isComposing) return;
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && onProcess) { event.preventDefault(); onProcess(); }
    if (event.key === "Escape" && onClear && !event.defaultPrevented) { event.preventDefault(); onClear(); }
  }}>
    {actions && <div className={s.toolbar}>{actions}</div>}
    <div className={s.body}>{children}{shortcuts && <p className={s.shortcuts}>Processed on your device; inputs are never saved. {shortcuts}.</p>}</div>
  </section>;
}
