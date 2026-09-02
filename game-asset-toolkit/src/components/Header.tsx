"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Layers className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Game Asset Toolkit
          </span>
        </motion.div>

        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex"
        >
          <a href="#features" className="transition hover:text-foreground">
            Features
          </a>
          <a href="#privacy" className="transition hover:text-foreground">
            Privacy
          </a>
          <a href="#roadmap" className="transition hover:text-foreground">
            Roadmap
          </a>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <a
            href="#converter"
            className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-background transition hover:bg-foreground/90"
          >
            Open Tool
          </a>
        </motion.div>
      </div>
    </header>
  );
}
