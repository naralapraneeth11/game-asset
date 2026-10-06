# Pixel Art Scaler and 1× / 2× / 3× generator

Two routes use one real browser-only processing engine:

```tsx
import PixelArtScaler from "@/tools/pixel-art-scaler/PixelArtScaler";

// Pixel-art page
<PixelArtScaler mode="pixel" />

// Existing density-generator page
<PixelArtScaler mode="density" />
```

The surrounding existing `ToolPage` supplies the route title, SEO, help and navigation. This workspace reuses the current `DropZone`, `buttonClass`, shared download/ZIP helper and warm-neutral/orange theme tokens. There is no separate theme, telemetry, backend or content persistence.

## Processing

- Native background worker, `createImageBitmap`, `OffscreenCanvas`, PNG export. No new codec dependency or Rust runtime is needed for canvas scaling.
- Pixel mode supports every integer factor from 1 through 16 with image smoothing disabled.
- Density mode emits all three sizes. Source density is explicit; both source dimensions must divide evenly by it. A 96×96 @3x source produces 32×32, 64×64 and 96×96 outputs. Filename labels reflect actual dimensions, not DPI metadata.
- Nearest-neighbor is the default. High-quality browser smoothing is an explicit option in density mode.
- PNG alpha is retained; no JPEG background flattening. Browser image decoding can normalize color profiles; source metadata is not copied. This is visual pixel scaling, not a byte-preserving PNG optimizer.
- File signatures and source dimensions are inspected before decoding. Static PNG/JPEG/WebP only. APNG and animated WebP are rejected, and GIF is intentionally not accepted.
- One image and one output canvas are processed at a time. Decoded bitmaps close, canvases release their storage and each image worker terminates at completion. Cancel terminates active workers immediately.
- 24 files, 32 MB per file, 16 megapixels per source/output, 8,192-pixel edges, conservative estimated working-memory ceiling of 256 MB. Retained PNGs and ZIP entries are capped at 96 MB. These limits reduce allocation risk; browser/device limits can still be lower.
- ZIP files contain PNGs plus `manifest.json` with original names, actual output names, dimensions, byte sizes and settings. Names are collision-safe, case-insensitively.

## UX

Files appear immediately in the queue directly below the add area, and duplicates are skipped by name/size/modification time. The selected file has input/output preview choices, a transparency checkerboard and 100–800% pixel inspection. Changed settings are explicitly marked until reprocessed. Per-image errors do not discard successfully completed outputs.

Keyboard: Cmd/Ctrl+Enter processes the batch while focus is in the workspace; Escape cancels an active operation. All file selection, settings and download controls are standard keyboard-accessible buttons/inputs.

## Delivery status

Implementation supplied without running tests, type checks or production builds, as requested. Validate in the destination application before deployment. Requires browser background-worker canvas support; unsupported browsers receive an explicit error.
