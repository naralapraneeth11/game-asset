import type { Metadata } from "next";
import ThreeDConverter from "@/components/ThreeDConverter";

export const metadata: Metadata = {
  title: "3D Converter",
  description:
    "Convert 3D assets between OBJ, STL, PLY, glTF, GLB, USD and USDZ. Local processing, correct coordinate systems, color-space aware textures.",
  keywords: [
    "3d converter",
    "obj to glb",
    "gltf to usdz",
    "usd converter",
    "local 3d converter",
    "game asset converter",
  ],
};

export default function ThreeDConverterPage() {
  return (
    <div className="min-h-full">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            3D Converter
          </h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Convert between OBJ, STL, PLY, glTF, GLB, USD and USDZ. 100% local.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <ThreeDConverter />
      </div>
    </div>
  );
}
