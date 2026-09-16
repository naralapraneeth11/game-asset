"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Layers, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Sidebar from "./Sidebar";
import s from "./AppShell.module.css";

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const previousCollapsed = useRef(false);
  useEffect(() => {
    if (collapsed && !previousCollapsed.current) openButton.current?.focus();
    previousCollapsed.current = collapsed;
  }, [collapsed]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);
  const close = () => { dialog.current?.close(); setMobileOpen(false); };
  return <div className={s.shell} data-collapsed={collapsed}>
    <a href="#tool-content" className={s.skip}>Skip to content</a>
    <aside className={s.sidebar} id="desktop-sidebar" aria-label="Primary navigation">{collapsed ? <div className={s.rail}><Link href="/" aria-label="Game Asset Toolkit home" className={s.iconButton}><Layers size={18} /></Link><button ref={openButton} className={s.iconButton} type="button" aria-label="Open sidebar" aria-expanded={false} aria-controls="desktop-sidebar" onClick={() => setCollapsed(false)}><PanelLeftOpen size={18} /></button></div> : <Sidebar controls={<button className={s.iconButton} type="button" aria-label="Collapse sidebar" aria-expanded aria-controls="desktop-sidebar" onClick={() => setCollapsed(true)}><PanelLeftClose size={15} /></button>} />}</aside>
    <div className={s.mobileBar}><Link href="/" className={s.brand}><Layers size={18} />Game Asset Toolkit</Link><button type="button" className={s.iconButton} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => { dialog.current?.showModal(); setMobileOpen(true); }}><Menu size={20} /></button></div>
    <dialog ref={dialog} id="mobile-navigation" aria-label="Navigation" className={s.dialog} onClose={() => setMobileOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}><Sidebar instance="mobile" onNavigate={close} controls={<button type="button" className={s.iconButton} aria-label="Close navigation" onClick={close}><X size={18} /></button>} /></dialog>
    <main id="tool-content" tabIndex={-1} className={s.content}>{children}</main>
  </div>;
}
