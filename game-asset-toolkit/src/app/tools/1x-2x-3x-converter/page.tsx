import type { Metadata } from "next";
import Converter from "@/components/Converter";

export const metadata: Metadata = {
  title: "1x / 2x / 3x Image Scaler",
  description:
    "Generate correct 1x, 2x and 3x assets from a single PNG. High-quality Lanczos or pixel-art nearest-neighbor. Local processing, ZIP download, proper @2x / @3x naming.",
  keywords: [
    "1x 2x 3x converter",
    "Retina image generator",
    "@2x @3x",
    "iOS asset scaler",
    "Unity sprite scaler",
    "pixel art scaler",
  ],
};

export default function ImageScalerPage() {
  return (
    <div className="min-h-full">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
            1x / 2x / 3x Image Scaler
          </h1>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            Drop a PNG → get correctly named 1x, 2x and 3x assets. 100% local.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <Converter />
      </div>
    </div>
  );
}
