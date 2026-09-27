"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/lib/theme";

const order: ThemeChoice[] = ["system", "light", "dark"];
const icons = { system: Monitor, light: Sun, dark: Moon } as const;
const names = { system: "System", light: "Light", dark: "Dark" } as const;

/** One icon button that cycles System → Light → Dark. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = icons[theme];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${names[theme]}. Switch to ${names[next]}.`}
      title={`Theme: ${names[theme]}`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-hover hover:text-foreground"
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
