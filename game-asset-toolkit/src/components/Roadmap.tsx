"use client";

import { motion } from "framer-motion";

const phases = [
  {
    phase: "Now",
    title: "Core Image Scaler",
    items: [
      "1x / 2x / 3x generation",
      "High-quality + Pixel-art modes",
      "Correct naming + ZIP export",
      "Live previews",
    ],
    status: "building",
  },
  {
    phase: "Next",
    title: "Game Dev Tools",
    items: [
      "Sprite sheet packing",
      "Batch processing",
      "Unity / Godot friendly exports",
      "Texture size helpers",
    ],
    status: "planned",
  },
  {
    phase: "Later",
    title: "Deep Pipeline",
    items: [
      "3D model helpers (GLTF inspection)",
      "Texture set management",
      "Normal map utilities",
      "More tools that solve real friction",
    ],
    status: "future",
  },
];

export default function Roadmap() {
  return (
    <section id="roadmap" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-12 text-center"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Roadmap
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Starting focused. Expanding only into tools that remove real friction
            from making games.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {phases.map((p, i) => (
            <motion.div
              key={p.phase}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card/60 p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {p.phase}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    p.status === "building"
                      ? "bg-accent/15 text-accent"
                      : p.status === "planned"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <h3 className="text-base font-medium text-foreground">{p.title}</h3>
              <ul className="mt-3 space-y-2">
                {p.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
