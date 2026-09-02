import type { Metadata } from "next";
import SpritePacker from "@/components/SpritePacker";

export const metadata: Metadata = {
  title: "Sprite Packer",
  description:
    "Pack sprites into optimized texture atlases with alpha trimming, MaxRects packing, padding, extrusion, and TexturePacker-compatible JSON.",
  keywords: [
    "sprite packer",
    "texture atlas",
    "sprite sheet",
    "MaxRects",
    "alpha trim",
    "game asset packer",
  ],
};

export default function SpritePackerPage() {
  return (
    <div className="min-h-full">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Sprite Packer
          </h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Pack sprites into texture atlases with trimming, padding, and JSON metadata. 100% local.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <SpritePacker />
      </div>
    </div>
  );
}
