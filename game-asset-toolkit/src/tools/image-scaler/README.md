# 1x 2x 3x Image Generator (hidden)

Status: **hidden** in `src/lib/tools.ts`. The page `/1x-2x-3x-image-generator` renders in `npm run dev` with a banner and returns
404 in production. `ImageScaler.tsx` is a UI mockup: the drop zone adds a hard-coded sample and Download ZIP does nothing.

Before setting `status: "live"`:

- Treat the dropped image as the largest (@3x) size and scale **down** to @2x and @1x; never upscale art.
- Engine: OffscreenCanvas in a worker; nearest-neighbor for pixel art, a high-quality resampler for everything else; `fflate`
  (already a dependency) for the ZIP.
- Naming presets: iOS (`@2x`, `@3x`), Android (`mdpi` … `xxxhdpi` folders), custom suffix.
- Batch Export's ideas (folders, platform presets) belong in this tool's Advanced panel.
- Rebuild the UI on the shared `DropZone`, `PresetPicker`, `AdvancedPanel` and `ResultList` components, then remove the mockup.
