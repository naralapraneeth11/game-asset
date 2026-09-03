import type { Metadata } from "next";
import BatchExport from "@/components/BatchExport";

export const metadata: Metadata = {
  title: "Batch Export",
  description:
    "Automated multi-folder batch export with presets, multi-scale, and platform formats. Built for game asset pipelines and CI.",
  keywords: [
    "batch export",
    "sprite batch",
    "texture pipeline",
    "multi scale",
    "game asset batch",
    "CI asset export",
  ],
};

export default function BatchExportPage() {
  return (
    <div className="min-h-full">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Batch Export
          </h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Multi-folder export with presets, scales, and platform formats. 100% local.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <BatchExport />
      </div>
    </div>
  );
}
