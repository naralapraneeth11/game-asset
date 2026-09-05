"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  X,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createSpritePacker,
  type PackResult,
  type ProgressInfo,
} from "@/tools/sprite-packer/engine";

const ATLAS_SIZES = [512, 1024, 2048, 4096] as const;
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
]);

export default function SpritePacker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [atlasSize, setAtlasSize] = useState<number>(2048);
  const [padding, setPadding] = useState(2);
  const [extrusion, setExtrusion] = useState(1);
  const [allowRotation, setAllowRotation] = useState(true);
  const [forcePot, setForcePot] = useState(false);
  const [packing, setPacking] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [result, setResult] = useState<PackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const acceptFiles = useCallback((list: FileList | File[]) => {
    const next = Array.from(list).filter(
      (f) =>
        IMAGE_TYPES.has(f.type) ||
        /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name)
    );
    if (next.length === 0) {
      setError("No valid images found. Use PNG, JPG, or WebP.");
      return;
    }
    setError(null);
    setResult(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFiles(next);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) acceptFiles(e.dataTransfer.files);
    },
    [acceptFiles]
  );

  const clearFiles = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const runPack = async () => {
    if (files.length === 0 || packing) return;
    setPacking(true);
    setError(null);
    setResult(null);
    setProgress(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    const packer = createSpritePacker({
      maxWidth: atlasSize,
      maxHeight: atlasSize,
      padding,
      extrusion: Math.min(extrusion, padding),
      rotation: allowRotation,
      powerOfTwo: forcePot,
      heuristic: "BSSF",
      format: "png",
    });

    packer.onProgress(setProgress);

    try {
      const packResult = await packer.pack(files);
      setResult(packResult);
      if (packResult.atlases[0]?.image) {
        setPreviewUrl(URL.createObjectURL(packResult.atlases[0].image));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Packing failed");
    } finally {
      packer.destroy();
      setPacking(false);
      setProgress(null);
    }
  };

  const downloadResult = async () => {
    if (!result) return;
    const packer = createSpritePacker(result.config);
    try {
      await packer.download(result);
    } finally {
      packer.destroy();
    }
  };

  const hasFiles = files.length > 0;
  const avgFill =
    result && result.atlases.length > 0
      ? result.atlases.reduce((s, a) => s + a.efficiency, 0) / result.atlases.length
      : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
            Sprite Packer
          </span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            MaxRects BSSF
          </span>
        </div>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
          Local · TexturePacker JSON
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) acceptFiles(e.target.files);
        }}
      />

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
              onClick={() => inputRef.current?.click()}
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
                Alpha trim · Padding · Extrusion · Multi-page
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
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <ImageIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      {files.length} sprite{files.length === 1 ? "" : "s"} selected
                    </p>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                      {packing
                        ? progress
                          ? `${progress.phase} · ${Math.round(progress.progress * 100)}%`
                          : "Working…"
                        : "Ready to pack"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFiles}
                  disabled={packing}
                  className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-40 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Max atlas size
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ATLAS_SIZES.map((size) => (
                      <button
                        key={size}
                        disabled={packing}
                        onClick={() => setAtlasSize(size)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition disabled:opacity-50",
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

                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Padding / Extrusion
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-[12px] text-neutral-500">Pad</span>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        value={padding}
                        disabled={packing}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setPadding(v);
                          if (extrusion > v) setExtrusion(v);
                        }}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 dark:bg-neutral-700"
                      />
                      <span className="w-8 text-right text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                        {padding}px
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-[12px] text-neutral-500">Extrude</span>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(padding, 1)}
                        value={Math.min(extrusion, padding)}
                        disabled={packing || padding === 0}
                        onChange={(e) => setExtrusion(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 dark:bg-neutral-700"
                      />
                      <span className="w-8 text-right text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                        {Math.min(extrusion, padding)}px
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                  <button
                    type="button"
                    disabled={packing}
                    onClick={() => setAllowRotation(!allowRotation)}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition-colors disabled:opacity-50",
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
                    type="button"
                    disabled={packing}
                    onClick={() => setForcePot(!forcePot)}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition-colors disabled:opacity-50",
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

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      Packing result
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Pages</p>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {result.totalPages}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Atlas size</p>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {result.config.maxWidth}×{result.config.maxHeight}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Sprites</p>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {result.totalSprites}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Fill</p>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {avgFill.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] text-neutral-400">
                      Packed in {result.duration}s · local only
                    </p>
                  </div>

                  {previewUrl && (
                    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-[length:16px_16px] bg-[linear-gradient(45deg,#e5e5e5_25%,transparent_25%),linear-gradient(-45deg,#e5e5e5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e5e5_75%),linear-gradient(-45deg,transparent_75%,#e5e5e5_75%)] bg-[position:0_0,0_8px,8px_-8px,-8px_0] dark:border-neutral-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Atlas preview"
                        className="mx-auto max-h-64 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {!result ? (
                  <button
                    onClick={runPack}
                    disabled={packing}
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    {packing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Packing…
                      </>
                    ) : (
                      "Pack Atlas"
                    )}
                  </button>
                ) : (
                  <button
                    onClick={downloadResult}
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Atlas + JSON
                  </button>
                )}
                <button
                  onClick={clearFiles}
                  disabled={packing}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-[13px] text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Clear
                </button>
                <p className="ml-auto text-[12px] text-neutral-400 dark:text-neutral-500">
                  MaxRects · BSSF · Phaser / Pixi ready
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
