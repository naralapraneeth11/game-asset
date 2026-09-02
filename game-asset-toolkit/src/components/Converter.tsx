"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Image as ImageIcon,
  Download,
  X,
  Check,
  Sparkles,
  Grid3X3,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScaleMode = "retina" | "pixel";

export default function Converter() {
  const [isDragging, setIsDragging] = useState(false);
  const [hasFiles, setHasFiles] = useState(false);
  const [scaleMode, setScaleMode] = useState<ScaleMode>("retina");
  const [selectedScales, setSelectedScales] = useState({
    "1x": true,
    "2x": true,
    "3x": true,
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // UI only — no real processing yet
    setHasFiles(true);
  }, []);

  const handleFileSelect = () => {
    // UI only
    setHasFiles(true);
  };

  const clearFiles = () => {
    setHasFiles(false);
  };

  const toggleScale = (key: "1x" | "2x" | "3x") => {
    setSelectedScales((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section id="converter" className="scroll-mt-20 px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40"
        >
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Image Scaler
              </span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                MVP
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
                <button
                  onClick={() => setScaleMode("retina")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
                    scaleMode === "retina"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  High Quality
                </button>
                <button
                  onClick={() => setScaleMode("pixel")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
                    scaleMode === "pixel"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Grid3X3 className="h-3 w-3" />
                  Pixel Art
                </button>
              </div>
            </div>
          </div>

          {/* Main area */}
          <div className="p-4 sm:p-6">
            <AnimatePresence mode="wait">
              {!hasFiles ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
                    isDragging
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                  )}
                  onClick={handleFileSelect}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">
                    Drop PNG or click to upload
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supports transparent PNGs • Multiple files • Paste from clipboard
                  </p>
                  <p className="mt-4 text-[11px] text-muted-foreground/70">
                    UI preview only — processing comes next
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  {/* Mock file list */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border border-border">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          hero_sprite.png
                        </p>
                        <p className="text-xs text-muted-foreground">
                          512 × 512 • Transparent
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearFiles}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Scale options */}
                  <div>
                    <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Generate scales
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(["1x", "2x", "3x"] as const).map((scale) => (
                        <button
                          key={scale}
                          onClick={() => toggleScale(scale)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition",
                            selectedScales[scale]
                              ? "border-accent/50 bg-accent/10 text-accent"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/40"
                          )}
                        >
                          {selectedScales[scale] && (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          {scale}
                          <span className="text-xs opacity-60">
                            {scale === "1x"
                              ? "512×512"
                              : scale === "2x"
                                ? "1024×1024"
                                : "1536×1536"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mock previews */}
                  <div>
                    <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Preview
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {(["1x", "2x", "3x"] as const)
                        .filter((s) => selectedScales[s])
                        .map((scale) => (
                          <div
                            key={scale}
                            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/20 p-3"
                          >
                            <div className="flex h-20 w-full items-center justify-center rounded-lg bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CiAgPHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMjcyNzJhIiAvPgogIDxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMjcyNzJhIiAvPgo8L3N2Zz4=')] bg-repeat">
                              <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-700/80 text-[10px] font-mono text-zinc-400">
                                {scale}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {scale === "1x"
                                ? "hero_sprite.png"
                                : scale === "2x"
                                  ? "hero_sprite@2x.png"
                                  : "hero_sprite@3x.png"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90">
                      <Download className="h-4 w-4" />
                      Download ZIP
                    </button>
                    <button
                      onClick={clearFiles}
                      className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      Clear
                    </button>
                    <p className="ml-auto text-xs text-muted-foreground">
                      Mode: {scaleMode === "retina" ? "High Quality (Lanczos)" : "Nearest Neighbor"}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Privacy note under converter */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          All processing happens in your browser. Nothing is uploaded.
        </p>
      </div>
    </section>
  );
}
