"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function Privacy() {
  return (
    <section id="privacy" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-border bg-gradient-to-b from-card to-muted/30 p-8 text-center sm:p-10"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Your assets never leave your machine
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Processing happens entirely in the browser using the Canvas API and
            Web Workers. There is no upload, no server-side image handling, and
            no telemetry on your files. This is a core product feature, not fine
            print.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
