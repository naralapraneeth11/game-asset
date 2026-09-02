"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initial = stored ?? preferred;
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = (next: Theme) => {
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  if (!mounted) {
    return (
      <div className="h-9 w-full rounded-full bg-neutral-100 dark:bg-neutral-800" />
    );
  }

  return (
    <div className="relative flex h-9 w-full items-center rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
      {/* Sliding white pill */}
      <motion.div
        className="absolute top-1 bottom-1 w-[calc(50%-2px)] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] dark:bg-neutral-700 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        layout
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 32,
          mass: 0.8,
        }}
        style={{
          left: theme === "light" ? 4 : "calc(50% + 2px)",
        }}
      />

      <button
        onClick={() => toggle("light")}
        className={cn(
          "relative z-10 flex h-full flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-medium transition-colors",
          theme === "light"
            ? "text-neutral-900"
            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        )}
      >
        <Sun className="h-3.5 w-3.5" strokeWidth={2} />
        Light
      </button>

      <button
        onClick={() => toggle("dark")}
        className={cn(
          "relative z-10 flex h-full flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-medium transition-colors",
          theme === "dark"
            ? "text-white"
            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        )}
      >
        <Moon className="h-3.5 w-3.5" strokeWidth={2} />
        Dark
      </button>
    </div>
  );
}
