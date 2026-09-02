"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  X,
  Image as ImageIcon,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ATLAS_SIZES = [512, 1024, 2048, 4096] as const;

export default function SpritePacker() {
  const [isDragging, setIsDragging] = useState(false);
  const [hasFiles, setHasFiles] = useState(false);
  const [atlasSize, setAtlasSize] = useState<number>(2048);
  const [padding, setPadding] = useState(2);
  const [allowRotation, setAllowRotation] = useState(true);
  const [forcePot, setForcePot] = useState(true);

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

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
            Sprite Packer
          </span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            MaxRects BSSF
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
          <Settings2 className="h-3.5 w-3.5" />
          Options
        </div>
      </div>

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
                "relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
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
                Drop sprites or click to upload
              </p>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                PNG · JPG · WebP · multiple files
              </p>
              <p className="mt-4 text-[11px] text-neutral-400 dark:text-neutral-500">
                UI preview — packing engine coming next
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* File summary */}
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <ImageIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      12 sprites selected
                    </p>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                      Alpha-trimmed · Ready to pack
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

              {/* Settings grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Atlas size */}
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Max atlas size
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ATLAS_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => setAtlasSize(size)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition",
                          atlasSize === size
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                            : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Padding */}
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Padding / Extrusion
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={8}
                      value={padding}
                      onChange={(e) => setPadding(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 dark:bg-neutral-700"
                    />
                    <span className="w-8 text-right text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      {padding}px
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                  <button
                    onClick={() => setAllowRotation(!allowRotation)}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition-colors",
                      allowRotation ? "bg-[#FF6B00]" : "bg-neutral-200 dark:bg-neutral-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        allowRotation ? "left-4" : "left-0.5"
                      )}
                    />
                  </button>
                  Allow 90° rotation
                </label>

                <label className="flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                  <button
                    onClick={() => setForcePot(!forcePot)}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition-colors",
                      forcePot ? "bg-[#FF6B00]" : "bg-neutral-200 dark:bg-neutral-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        forcePot ? "left-4" : "left-0.5"
                      )}
                    />
                  </button>
                  Power-of-two size
                </label>
              </div>

              {/* Mock result */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Packing result
                </p>
                <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Pages</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">1</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Atlas size</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {atlasSize}×{atlasSize}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Sprites</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">12</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Fill</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">78%</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                  <Download className="h-3.5 w-3.5" />
                  Download Atlas + JSON
                </button>
                <button
                  onClick={clearFiles}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-[13px] text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Clear
                </button>
                <p className="ml-auto text-[12px] text-neutral-400 dark:text-neutral-500">
                  MaxRects · BSSF · TexturePacker JSON
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
