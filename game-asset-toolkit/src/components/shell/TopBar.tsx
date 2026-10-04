"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { categories, getToolsByCategory } from "@/lib/tools";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { LogoMark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { ToolLink } from "./ToolLink";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export function TopBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl K");
  const menuButton = useRef<HTMLButtonElement>(null);
  const mobileButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) (window.matchMedia("(min-width: 768px)").matches ? menuButton : mobileButton).current?.focus();
  }, []);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setShortcut("⌘K");
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMenuOpen(false);
        setPaletteOpen((open) => !open);
      } else if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping(event.target) && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        setMenuOpen(false);
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeMenu(true); };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !menuButton.current?.contains(target) && !mobileButton.current?.contains(target)) closeMenu();
    };
    const small = window.matchMedia("(max-width: 767px)").matches;
    const overflow = document.body.style.overflow;
    if (small) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen, closeMenu]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-1 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-3 flex shrink-0 items-center gap-2.5 rounded-lg" aria-label={`${site.name} home`}>
          <LogoMark size={28} />
          <span className="text-[15px] font-semibold tracking-[0.08em]">{site.name}</span>
        </Link>

        <button
          ref={menuButton}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="tools-menu"
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            "hidden h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-hover hover:text-foreground md:inline-flex",
            menuOpen && "bg-hover text-foreground",
          )}
        >
          Tools
          <ChevronDown className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-180")} aria-hidden />
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => { setMenuOpen(false); setPaletteOpen(true); }}
          aria-label="Search tools"
          aria-keyshortcuts="Meta+K Control+K"
          className="inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-muted-foreground transition hover:bg-hover hover:text-foreground md:w-64 md:border md:border-border md:bg-card md:px-3"
        >
          <Search className="h-[18px] w-[18px] md:h-4 md:w-4" aria-hidden />
          <span className="hidden flex-1 text-left md:inline">Search tools…</span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[11px] md:inline" suppressHydrationWarning>{shortcut}</kbd>
        </button>

        <ThemeToggle />

        <button
          ref={mobileButton}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="tools-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-hover hover:text-foreground md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>

      {/* Outside the header: its backdrop-filter would become the containing block for this fixed panel. */}
      {menuOpen && (
        <div
          ref={panel}
          id="tools-menu"
          className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto border-t border-border bg-background md:inset-x-auto md:bottom-auto md:left-1/2 md:top-16 md:max-h-[min(640px,calc(100vh-88px))] md:w-[min(1080px,calc(100vw-48px))] md:-translate-x-1/2 md:rounded-2xl md:border md:bg-card md:shadow-card"
        >
          <nav aria-label="All tools" className="grid gap-8 p-5 sm:grid-cols-2 md:p-6 lg:grid-cols-4">
            {categories.map((category) => {
              const list = getToolsByCategory(category.id);
              if (!list.length) return null;
              return (
                <div key={category.id} className="min-w-0">
                  <Link href={category.href} onClick={() => closeMenu()} className="mb-2 flex items-center gap-2 rounded-md eyebrow hover:text-foreground">
                    <category.icon className="h-3.5 w-3.5" aria-hidden />
                    {category.label}
                  </Link>
                  <ul className="space-y-0.5">
                    {list.map((tool) => (
                      <li key={tool.id}>
                        <ToolLink
                          tool={tool}
                          onClick={() => closeMenu()}
                          aria-current={pathname === tool.href ? "page" : undefined}
                          className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-foreground/85 transition hover:bg-hover hover:text-foreground aria-[current=page]:bg-primary-soft aria-[current=page]:font-medium aria-[current=page]:text-foreground"
                        >
                          <tool.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span className="truncate">{tool.name}</span>
                        </ToolLink>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
