"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { tools } from "@/lib/tools";
import s from "./dev.module.css";

export interface ToolShellProps { toolId?: string; title?: string; description?: string; children: ReactNode; actions?: ReactNode; onClear?: () => void; onProcess?: () => void; className?: string; }

export function ToolShell({ toolId, title, description, children, actions, onClear, onProcess, className = "" }: ToolShellProps) {
  const tool = tools.find((item) => item.id === toolId);
  const related = tools.filter((item) => item.category === "developer" && item.id !== toolId).filter((item) => item.group === tool?.group).slice(0, 3);
  return <section className={`${s.shell} ${className}`} aria-label={title || tool?.name || "Developer tool"} onKeyDown={(event) => {
    if (event.nativeEvent.isComposing) return;
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && onProcess) { event.preventDefault(); onProcess(); }
    if (event.key === "Escape" && onClear && !event.defaultPrevented) { event.preventDefault(); onClear(); }
  }}>
    <header className={s.header}><div className={s.headerInner}><div><div className={s.eyebrow}><ShieldCheck size={13} aria-hidden />Developer tools<span aria-hidden> / </span>{tool?.group || "Workspace"}</div><h1 className={s.title}>{title || tool?.name || "Developer tool"}</h1><p className={s.description}>{description ?? tool?.description}</p></div>{actions}</div></header>
    <div className={s.body}>{children}<footer className={s.footer}><p className={s.muted}>Processed on your device. Inputs are never saved.{onProcess ? " ⌘ / Ctrl + Enter to run." : ""}{onClear ? " Esc to clear." : ""}</p><nav className={s.related} aria-label="Related developer tools">{related.map((item) => <Link key={item.id} href={item.href}>{item.shortName}</Link>)}<Link href="/tools/dev">All developer tools →</Link></nav></footer></div>
  </section>;
}
