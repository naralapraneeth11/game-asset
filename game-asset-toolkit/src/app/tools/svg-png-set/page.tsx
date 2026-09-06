import type { Metadata } from "next";

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
    <div className="flex min-h-full flex-col">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            SVG to PNG Set
          </h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Web · Apple · Android · Custom sizes. Alpha trim, safe zones, ZIP
            bundles. Runs entirely on your device.
          </p>
        </div>
      </div>

      <div className="relative min-h-[calc(100vh-8rem)] flex-1 bg-[#f6f7f9]">
        <iframe
          src="/svg-to-png-studio.html"
          title="SVG to PNG Studio"
          className="absolute inset-0 h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-downloads allow-modals"
          loading="eager"
        />
      </div>
    </div>
  );
}
