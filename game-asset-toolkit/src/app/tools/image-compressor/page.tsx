import type { Metadata } from "next";
import ImageCompressor from "@/tools/image-compressor/ImageCompressor";
export const metadata: Metadata = {
  title: "Image Compressor",
  description: "Compress JPEG, PNG, WebP and AVIF images locally. Compare results, resize, target a file size and download folder-preserving ZIPs. Images stay on your device.",
};
export default function ImageCompressorPage() {
  return <div className="min-h-full">
    <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"><div className="mx-auto max-w-4xl px-6 py-5"><h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Image Compressor</h1><p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">Reduce image size, compare the details, and export a complete batch. Runs entirely on your device.</p></div></div>
    <div className="mx-auto max-w-4xl px-6 py-8"><ImageCompressor /></div>
  </div>;
}
