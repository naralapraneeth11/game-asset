# Sprite utilities

The `SpriteUtilities` client component powers two routes using the existing Game Asset Toolkit shell and design tokens:

- `mode="gif"`: GIF to sprite sheet.
- `mode="split"`: sprite sheet splitter.

All file reads, GIF decoding, canvas processing, and PNG encoding happen in a dedicated module worker. Cancelling terminates that worker immediately, including synchronous GIF decoding. ZIP download uses the shared local-files ZIP worker. No input/output persistence, uploads, external assets, or third-party runtime calls are introduced.

## GIF behavior

`gifuct-js` 2.1.2 parses the file and decompresses one patch at a time. The compositor applies previous-frame disposal before painting the next image, saves/restores the affected region for disposal 3, and draws transparent patches over the accumulated canvas without erasing pixels beneath them. Frames before the selected range and between sampled frames still participate in composition.

Transparent background is the default for game sprites; restore-to-background disposal clears to transparent in this mode. Choosing GIF palette background uses the global color table background for the initial canvas and disposal 2. This is an explicit export choice because GIF viewer background behavior varies. The source preview shows the first frame in transparent mode.

The JSON is an array of atlas frames with rectangle, source size, source frame index (zero-based), source time, and duration in milliseconds. Sampling accumulates the skipped durations into the previous exported frame, preserving the selected timeline length while omitting intermediate motion. Missing/zero delays use 100 ms; nonzero GIF delays are preserved exactly. Original looping metadata is recorded without inventing playback semantics for consumers. Padding is transparent spacing, not edge extrusion. No trimming, resampling filters, or hidden deduplication alter sprites.

Limits are deliberate: 32 MiB GIF, 4 MP logical screen, 5000 source frames, 300 million decoded patch pixels, 512 exported sprites, 16 MP atlas, 8192px per atlas side, and 64 MiB encoded outputs. Increase interval, shorten the range, or reduce scale when needed. Full-animation source decoding remains necessary for correct frame disposal.

## Splitter behavior

PNG, JPEG, and static WebP headers are inspected before decoding to constrain allocation. Animated PNG/WebP are rejected. The browser applies standard image orientation when decoding; the preview and grid share those decoded dimensions.

Rows/columns mode requires exact integer division, avoiding silently missing edge pixels. Cell mode exports only complete cells and reports unused right/bottom pixels. Outer margin applies to all edges; offsets additionally shift the first cell in from the left/top margin. Gutter is the distance between source cells. Output padding adds transparent pixels around each extracted image.

The manifest records source grid coordinates, original cell indexes, row/column order, selected range, and skipped fully transparent cells. PNG names retain original cell numbers after skips. RGB values are not used to classify emptiness; only alpha=0 qualifies. Limits: 64 MiB source, 16 MP source, 8192px per side, 1024 cells, and 64 MiB encoded output.

## Integration

Requires the existing `DropZone`, `AdvancedPanel`, `Toggle`, `buttonClass`, `formatBytes`, and `useObjectUrl`, plus the package's shared `@/tools/local-files/download` helpers and `gifuct-js` 2.1.2. Keep this folder under `src/tools/sprite-utilities/`; it owns its types, geometry, parsers, worker, hook, and view. Route metadata and registry entries live outside the feature folder, following the existing app.

No tests, type checks, or builds were run for this delivery, as requested. Browser acceptance checks remain with the integrator, particularly disposal-heavy GIFs, low-memory mobile devices, and canvas/worker support.
