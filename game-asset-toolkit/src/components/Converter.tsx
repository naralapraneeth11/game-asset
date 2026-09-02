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
    setHasFiles(true);
  }, []);

  const handleFileSelect = () => {
    setHasFiles(true);
  };

  const clearFiles = () => {
    setHasFiles(false);
  };

  const toggleScale = (key: "1x" | "2x" | "3x") => {
    setSelectedScales((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
            Image Scaler
          </span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            MVP
          </span>
        </div>

        <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
          <button
            onClick={() => setScaleMode("retina")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition",
              scaleMode === "retina"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            )}
          >
            <Sparkles className="h-3 w-3" />
            High Quality
          </button>
          <button
            onClick={() => setScaleMode("pixel")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition",
              scaleMode === "pixel"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            )}
          >
            <Grid3X3 className="h-3 w-3" />
            Pixel Art
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="p-5">
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
                "relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
                isDragging
                  ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800"
                  : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/50"
              )}
              onClick={handleFileSelect}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <Upload className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-neutral-900 dark:text-neutral-100">
                Drop PNG or click to upload
              </p>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                Transparent PNGs · Multiple files · Clipboard paste
              </p>
              <p className="mt-4 text-[11px] text-neutral-400 dark:text-neutral-500">
                UI preview only — processing comes next
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* File row */}
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <ImageIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      hero_sprite.png
                    </p>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                      512 × 512 · Transparent
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFiles}
                  className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scales */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Generate scales
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["1x", "2x", "3x"] as const).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => toggleScale(scale)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition",
                        selectedScales[scale]
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600"
                      )}
                    >
                      {selectedScales[scale] && (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {scale}
                      <span className="text-[11px] opacity-60">
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

              {/* Previews */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Preview
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(["1x", "2x", "3x"] as const)
                    .filter((s) => selectedScales[s])
                    .map((scale) => (
                      <div
                        key={scale}
                        className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/40"
                      >
                        <div className="flex h-16 w-full items-center justify-center rounded-md border border-neutral-100 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-100 text-[10px] font-mono text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                            {scale}
                          </div>
                        </div>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
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
                <button className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                  <Download className="h-3.5 w-3.5" />
                  Download ZIP
                </button>
                <button
                  onClick={clearFiles}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-[13px] text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Clear
                </button>
                <p className="ml-auto text-[12px] text-neutral-400 dark:text-neutral-500">
                  {scaleMode === "retina"
                    ? "High Quality (Lanczos)"
                    : "Nearest Neighbor"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
