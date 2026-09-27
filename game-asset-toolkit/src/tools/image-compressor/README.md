# Image Compressor

Page: `/image-compressor` (`src/app/image-compressor/page.tsx`).

First screen: drop images, folders or a paste → compression starts right away with **Balanced** → results with the total
saved and one Download button. Presets are three buttons that stay selected (Smaller file 60 / Balanced 80 / Higher quality 92;
AVIF uses 40 / 60 / 80). Everything else, including offline mode and "Fit large images safely", lives in Advanced.

**Keep original format** is the default output (`format: "original"`). The worker detects each file's real format from its bytes
and `resolveFormat()` (`engine/core.ts`) turns the settings into concrete ones: PNGs stay PNG and are optimized losslessly with
OxiPNG, so sprites stay pixel-perfect; lossy presets map to AVIF's quality scale; target sizes do not apply to PNG.

```
image-compressor/
├── ImageCompressor.tsx      UI on the shared DropZone / PresetPicker / AdvancedPanel components
├── Compare.tsx              Before/after slider with zoom and pan
├── Offline.tsx              Opt-in offline mode (service worker scope: /image-compressor)
├── useCompressor.ts         Queue, one worker at a time, memory budgets
├── export.ts                Single downloads and folder-preserving ZIP with a JSON report
├── input.ts                 Folder drops and the sample image
├── engine/                  core.ts, headers.ts, compress.worker.ts, offline-sw.js
├── scripts/                 prepare.mjs (codecs → public/), offline-manifest.mjs (after next build)
└── tests/core.test.mjs      Tests for the shipped engine module
```

- Prepare assets: `npm run prepare:image-compressor` (also runs on install, dev and build). Output in
  `public/tools/image-compressor/` and `public/image-compressor-sw.js` is generated and git-ignored.
- Test: `npm run test:image-compressor`.
- Offline manifest: `node src/tools/image-compressor/scripts/offline-manifest.mjs` runs after `next build` in `npm run build`.

If the page route changes, update `SCOPE` in `Offline.tsx` and `ROUTE` in `engine/offline-sw.js` together.
