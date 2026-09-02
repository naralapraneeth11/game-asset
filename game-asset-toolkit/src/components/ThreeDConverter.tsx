"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Box,
  Download,
  X,
  Check,
  FileBox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INPUT_FORMATS = ["obj", "stl", "ply", "gltf", "glb"] as const;
const OUTPUT_FORMATS = ["obj", "stl", "ply", "gltf", "glb", "usd", "usda", "usdc", "usdz"] as const;

type InputFormat = (typeof INPUT_FORMATS)[number];
type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export default function ThreeDConverter() {
  const [isDragging, setIsDragging] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("glb");
  const [autoRepair, setAutoRepair] = useState(true);

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
    setHasFile(true);
  }, []);

  const handleFileSelect = () => {
    setHasFile(true);
  };

  const clearFile = () => {
    setHasFile(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
            3D Asset Converter
          </span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            Local
          </span>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-neutral-500 dark:text-neutral-400">
          <span>Auto-repair</span>
          <button
            onClick={() => setAutoRepair(!autoRepair)}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              autoRepair ? "bg-[#FF6B00]" : "bg-neutral-200 dark:bg-neutral-700"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                autoRepair ? "left-4" : "left-0.5"
              )}
            />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {!hasFile ? (
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
                Drop 3D file or click to upload
              </p>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                OBJ · STL · PLY · glTF · GLB
              </p>
              <p className="mt-4 text-[11px] text-neutral-400 dark:text-neutral-500">
                UI preview — conversion engine coming next
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
                    <FileBox className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      character_model.glb
                    </p>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                      2.4 MB · glTF Binary
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Output format */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Output format
                </p>
                <div className="flex flex-wrap gap-2">
                  {OUTPUT_FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setOutputFormat(fmt)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[13px] font-medium uppercase transition",
                        outputFormat === fmt
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600"
                      )}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mock inspection */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Inspection
                </p>
                <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Meshes</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">3</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Triangles</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">12,480</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Materials</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">2</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Textures</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">4</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                  <Download className="h-3.5 w-3.5" />
                  Convert & Download
                </button>
                <button
                  onClick={clearFile}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-[13px] text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Clear
                </button>
                <p className="ml-auto text-[12px] text-neutral-400 dark:text-neutral-500">
                  {autoRepair ? "Auto-repair enabled" : "Raw export"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
