"use client";

import { motion } from "framer-motion";
import { ArrowDown, Shield, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-20">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          100% local processing • Files never leave your browser
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-[3.25rem] md:leading-[1.15]"
        >
          Drop assets.
          <br />
          <span className="text-muted-foreground">Get game-ready outputs.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          The clean, fast asset pipeline built by a game developer for indie
          teams, Unity/Godot/Unreal projects, and pixel artists who hate
          clunky converters.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#converter"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90"
          >
            Try the converter
            <ArrowDown className="h-4 w-4" />
          </a>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Instant
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              Private
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
