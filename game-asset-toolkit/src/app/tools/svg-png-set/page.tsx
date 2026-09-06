import type { Metadata } from "next";
import SvgPngSet from "@/tools/svg-png-set/SvgPngSet";

export const metadata: Metadata = {
  title: "SVG to PNG Set",
  description:
    "Render scalable SVGs into multi-resolution PNG bundles for Web, Apple, and Android. Favicons, app icons, adaptive icons — 100% local in your browser.",
  keywords: [
    "svg to png",
    "app icon generator",
    "favicon generator",
    "apple appiconset",
    "android mipmap",
    "pwa icons",
    "svg rasterizer",
  ],
};

export default function SvgPngSetPage() {
  return (
    <div className="min-h-full">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            SVG to PNG Set
          </h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Convert SVGs into PNG sets with custom sizes, trimming, and app icon
            presets. Runs entirely on your device.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <SvgPngSet />
      </div>
    </div>
  );
}
