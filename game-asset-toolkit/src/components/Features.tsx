"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  Layers,
  Grid3X3,
  Package,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant local processing",
    description:
      "No upload latency. Everything runs in your browser with Web Workers so the UI never freezes.",
  },
  {
    icon: Shield,
    title: "Private by design",
    description:
      "Files never leave your device. We can prove it — no network requests for your assets.",
  },
  {
    icon: Layers,
    title: "Correct scale naming",
    description:
      "Proper @2x / @3x filenames, Unity-style suffixes, or custom naming presets.",
  },
  {
    icon: Grid3X3,
    title: "Pixel-art ready",
    description:
      "Nearest-neighbor scaling that keeps edges crisp. No blurry sprites.",
  },
  {
    icon: Package,
    title: "One-click ZIP",
    description:
      "Download a clean ZIP ready to drop into your project. Multiple assets at once.",
  },
  {
    icon: Sparkles,
    title: "High-quality resizing",
    description:
      "Lanczos / Pica resampling for UI and Retina assets when you need quality.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-12 text-center"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Built for how game developers actually work
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            No accounts, no spam, no unnecessary steps. Just the tools you need
            when you’re in the middle of a build.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card/50 p-5 transition hover:border-border/80 hover:bg-card"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <feature.icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
