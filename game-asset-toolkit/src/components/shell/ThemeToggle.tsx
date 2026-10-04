"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const options: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * Theme preference: System, Light or Dark. There are only two visual themes;
 * System resolves to one of them from prefers-color-scheme and follows changes.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("pointerdown", onPointer); window.removeEventListener("keydown", onKey); };
  }, [open]);

  const move = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    root.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]')[(index + delta + options.length) % options.length]?.focus();
  };

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${options.find((option) => option.value === theme)?.label}`}
        title="Theme"
        onClick={() => setOpen((value) => !value)}
        className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-hover hover:text-foreground", open && "bg-hover text-foreground")}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </button>
      {open && (
        <div role="menu" aria-label="Theme" className="absolute right-0 top-[calc(100%+8px)] z-50 w-40 rounded-2xl border border-border bg-surface-elevated p-1.5 shadow-card">
          {options.map((option, index) => {
            const checked = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                onKeyDown={(event) => move(event, index)}
                onClick={() => { setTheme(option.value); setOpen(false); button.current?.focus(); }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition",
                  checked ? "bg-accent font-medium text-accent-foreground" : "text-foreground hover:bg-hover",
                )}
              >
                <option.icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{option.label}</span>
                {checked && <Check className="h-4 w-4" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
