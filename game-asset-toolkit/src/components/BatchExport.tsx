"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  X,
  FolderOpen,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  { id: "desktop", label: "Desktop", desc: "PNG · Full res" },
  { id: "mobile", label: "Mobile", desc: "ASTC · Multi-scale" },
  { id: "web", label: "Web", desc: "WebP · Basis" },
] as const;

const SCALES = [
  { id: "1x", label: "1×" },
  { id: "0.5x", label: "0.5×" },
  { id: "0.25x", label: "0.25×" },
] as const;

export default function BatchExport() {
  const [isDragging, setIsDragging] = useState(false);
  const [hasFolders, setHasFolders] = useState(false);
  const [preset, setPreset] = useState<string>("desktop");
  const [selectedScales, setSelectedScales] = useState<string[]>(["1x"]);

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
    setHasFolders(true);
  }, []);

  const handleSelect = () => {
    setHasFolders(true);
  };

  const clear = () => {
    setHasFolders(false);
  };

  const toggleScale = (id: string) => {
    setSelectedScales((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
            Batch Export Pipeline
          </span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            Multi-folder
          </span>
        </div>
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {!hasFolders ? (
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
              onClick={handleSelect}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <FolderOpen className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-neutral-900 dark:text-neutral-100">
                Drop asset folders or click to select
              </p>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                Each folder becomes one atlas · Nested folders supported
              </p>
              <p className="mt-4 text-[11px] text-neutral-400 dark:text-neutral-500">
                UI preview — batch engine coming next
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
              {/* Folder summary */}
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <Layers className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      3 folders queued
                    </p>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                      ui · characters · effects
                    </p>
                  </div>
                </div>
                <button
                  onClick={clear}
                  className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Preset */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Export preset
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition",
                        preset === p.id
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                      )}
                    >
                      <div className="text-[13px] font-medium">{p.label}</div>
                      <div
                        className={cn(
                          "text-[11px]",
                          preset === p.id
                            ? "text-neutral-300 dark:text-neutral-500"
                            : "text-neutral-400"
                        )}
                      >
                        {p.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scales */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Scales
                </p>
                <div className="flex flex-wrap gap-2">
                  {SCALES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleScale(s.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition",
                        selectedScales.includes(s.id)
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mock status */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Queue status
                </p>
                <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Tasks</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">3</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Preset</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                      {preset}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Scales</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {selectedScales.join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Cache</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">Ready</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                  <Download className="h-3.5 w-3.5" />
                  Run Batch Export
                </button>
                <button
                  onClick={clear}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-[13px] text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Clear
                </button>
                <p className="ml-auto text-[12px] text-neutral-400 dark:text-neutral-500">
                  Incremental · Parallel · CI-ready
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
