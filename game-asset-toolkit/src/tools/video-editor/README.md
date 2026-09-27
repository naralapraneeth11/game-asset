# Video tools

One engine behind four pages:

| Page | Component | First screen | Inside Advanced |
| --- | --- | --- | --- |
| `/video-compressor` | `VideoTask mode="compress"` | Smaller / Balanced / Best quality, optional 10 / 25 / 50 MB target | Format, codec, resolution, frame rate, quality, remove audio |
| `/video-converter` | `VideoTask mode="convert"` | Convert to MP4, WebM, MOV, GIF or MP3 | Codec, resolution, frame rate, quality; WAV and AAC |
| `/video-to-gif` | `VideoTask mode="gif"` | Start and end (30 s max), width 320 / 480 / 640 | Frame rate |
| `/video-editor` | `VideoEditor` | The full editor: trim, crop, rotate, color, text, watermark, audio | Export settings, collapsed to a one-line summary |

`VideoTool.tsx` picks the component from the `mode` prop. Every page shares `useVideoEditor` (queue, worker bridge, cancellation,
downloads), the worker, and WebCodecs + FFmpeg. Task pages pass `initialSettings` (for example the compressor's Balanced preset:
up to 1080p, quality 0.72), an output-name suffix (`clip_compressed.mp4`) and `shortcut: "all"` so Cmd/Ctrl + Enter processes the
whole batch.

Compressor presets map onto the existing settings fields: Smaller = 720p, quality 0.50; Balanced = up to 1080p, quality 0.72;
Best quality = original resolution, quality 0.85. Tune them against real clips.

## Cross-origin isolation

FFmpeg runs multi-threaded only when the page is cross-origin isolated. `config/next.ts` sends COOP/COEP/CORP headers for every
path in `VIDEO_ROUTES` (`src/lib/routes.ts`) and for the engine assets under `/tools/video-editor/`. Headers only arrive with a full
document load, so links to video pages use `ToolLink`, which renders a plain anchor for tools marked `isolated` in the registry.
Adding a video page means adding its path to `VIDEO_ROUTES` and marking the tool `isolated: true`.

Installation and build hooks prepare the FFmpeg assets automatically (`npm run prepare:video-editor`). **Rust does not need to be
installed to run or deploy.** The compiled `public/tools/video-editor/pixel-ops.wasm` is committed; large FFmpeg assets are generated
from pinned npm dependencies into `public/tools/video-editor/vendor/` (git-ignored).

## Included functionality

| Area | Implementation |
| --- | --- |
| Import | Multiple local files, file drop, immediate visible queue, duplicate prevention, metadata and errors per file |
| Trim | In/out sliders and numeric seconds; set endpoints from current playback position |
| Geometry | Free crop and 16:9 / 9:16 / 1:1 / 4:5 presets; draggable corners; numeric alternatives; 90° rotations and flips |
| Video | MP4 H.264 / HEVC / native AV1; WebM VP9 / native AV1; MOV H.264 / HEVC |
| Size | Original / 1080p / 720p / 480p; quality-derived bitrate; estimated target MB; selectable frame rate |
| GIF | Two-pass optimized palette, bounded duration and dimensions, no audio |
| Color | Brightness, contrast, saturation, linear-light exposure, warm / cool / mono / cinema looks |
| Overlays | Multiline text, generic fonts, color, scale, opacity, drag or keyboard position; PNG/JPEG watermark |
| Audio | Mute, gain, loudness normalization, MP3 / WAV / AAC extraction |
| Speed | 0.25×–4×, optional pitch preservation |
| Frames | PNG/JPEG snapshot with crop, colors, rotation and overlays |
| Export | Sequential batch processing, progress, cancel, per-file errors, downloadable results, duplicate-safe ZIP names, OS sharing where supported |
| Preview | Source playback with approximate live edits, crop mode, actual exported-result playback, seeking, fullscreen |
| Access | Responsive layout, labeled controls, keyboard tabs, focus states, status announcements, reduced-motion support |

In the editor, Cmd/Ctrl + Enter exports the selected file; on task pages it processes every file. Escape cancels the current operation. Space toggles playback when the preview frame has focus. Arrow keys seek in the focused preview; arrows on text/watermark move it 1%, or 5% with Shift. Numeric crop controls provide keyboard alternatives to pointer handles.

Batch files share the current settings. Trim-out is bounded by each source duration; a trim-in beyond a shorter file's duration produces a file-specific error. A previously exported result remains available if a later export fails; it reflects the settings used for that successful export.

## Architecture

```text
src/app/video-*/page.tsx                   Routes; metadata and copy come from the registry
src/tools/video-editor/
  VideoTool.tsx                           Picks the page UI from the mode prop
  VideoTask.tsx                           Compressor, converter and GIF pages
  VideoEditor.tsx / .module.css           Full editor UI and shared styles
  describe.ts                             One-line export summary for Advanced headers
  components/                            Preview, controls, shared orange toggle adapter
  useVideoEditor.ts                      Queue, bridge, cancellation, downloads, lifecycle
  types.ts                               Contracts, defaults, limits
  engine/video.worker.ts                 Serialized jobs, routing, ZIP, capability audit
  engine/native.ts                       WebCodecs through Mediabunny Conversion
  engine/metadata.ts                     Bounded local Blob reads; no remote playlists
  engine/fallback.ts                     Whole-file FFmpeg compatibility jobs
  engine/storage.ts                      OPFS sync writer and bounded memory fallback
  engine/pixels.ts                       Canvas geometry, Rust color, text/logo, LUT
  engine/shared.ts                       Geometry, trim, bitrate planning, filenames
  rust/pixel-ops/                        Rust source, lockfile, no crate dependencies
  config/next.ts                         Route-scoped isolation headers
  scripts/                              Asset preparation, optional Rust build
  licenses/                             Dependency notices and license texts
public/tools/video-editor/pixel-ops.wasm  Included compiled color engine
public/tools/video-editor/vendor/        Generated self-hosted FFmpeg assets
```

Native export checks each file's actual decoders and each requested output configuration. Mediabunny handles demuxing, sample ownership, encoder backpressure, A/V timestamps and muxing. Both tracks use one complete processing path. Native failure may restart the entire operation through FFmpeg; it never splices audio from one engine with video from another.

FFmpeg is used for speed, audio processing/extraction, GIF, or unsupported native codec configurations. Input is mounted with WORKERFS instead of copying the entire source into the Wasm heap. FFmpeg output is still in its memory filesystem: OPFS does not remove FFmpeg's Wasm memory limits.

Rust applies RGBA color transforms one frame at a time. Geometry and overlays use OffscreenCanvas. The fallback samples the same Rust transform into a 33³ LUT; interpolation and browser color conversion can create small differences between engines. Live CSS preview is explicitly approximate; use the exported result or a frame snapshot to inspect exact output.

The UI stays in TypeScript. Comlink provides typed worker RPC. Mediabunny replaces the deprecated mp4-muxer package. fflate, already used elsewhere in the app, packages video outputs without recompressing them. All executable codec assets are served by your app; no processing CDN or server endpoint is introduced.

## Limits and deliberate behavior

- Native input: at most 8 GiB. Compatibility input: at most 256 MiB. These are application limits, not guarantees that every device can process a file of that size.
- Source decode: at most 16 megapixels. Output: at most 8,294,400 pixels and 4096 px on either side. Large Original outputs are constrained by this ceiling. Resizing does not upscale.
- Native output streams to temporary origin-private browser storage when supported, with quota checks and one writer per file. Without that facility, output is bounded to 128 MiB.
- FFmpeg output is bounded to 128 MiB and checked for truncation. Codec and source complexity still affect peak memory. Retained in-memory results are limited to 256 MiB. Save and remove completed files to free their resources.
- ZIP download: 256 MiB of total results; larger batches can be saved individually. ZIP work runs in the worker but needs bounded additional memory.
- GIF: up to 30 seconds, 320 / 480 / 640 px wide (`gifWidth`), up to 15 fps. GIF uses a palette, not the video quality/target-size controls.
- Target MB is a bitrate estimate, not an exact or maximum-size promise. Very small targets are rejected. Audio-only and GIF exports ignore the video target size.
- AV1 is available only when the browser's native encoder works for the requested configuration. The bundled FFmpeg build does not provide an AV1 encoder. Hardware acceleration is not promised by a positive support check.
- SDR output only. HDR/wide-gamut video editing and frame extraction are rejected instead of silently changing colors; audio extraction is still possible.
- Only the primary video and audio tracks are exported. Subtitles, attachments and secondary tracks are omitted. Metadata is stripped. Native video alpha is flattened. Compatibility audio exports at 48 kHz stereo, with 128 kbps for compressed formats; WAV is PCM.
- The live preview uses the browser's video player. Some sources can export through FFmpeg even when the player cannot preview them. Some exported codecs also require another player for playback.
- FFmpeg multithreading requires cross-origin isolation and SharedArrayBuffer. Headers are scoped to the video pages, which are always opened with a full page load (see Cross-origin isolation). Single-thread fallback remains available.
- Native MP4/MOV writes a seekable file with the index at the end; it does not claim progressive web playback. Compatibility MP4/MOV uses fast-start relocation.
- No PWA/offline installation is included. Native export loads once its app code is available; FFmpeg is downloaded on demand the first time it is needed. Do not promise universal offline use after a single visit.

## Privacy and cleanup

Files, frames, tokens and edit settings are never sent to a server or stored in localStorage. Fetches load app code only. Native media sources reject HLS playlists; FFmpeg's input protocol allowlist is local files/pipes. Remote URL input is not supported.

Temporary OPFS output is necessary for large native exports. Remove/Clear deletes this session's outputs; normal component teardown also attempts cleanup. A browser crash or forced tab termination can interrupt cleanup and leave temporary bytes in this origin's site storage. There is no content history or automatic project restore. Browser site-data controls can remove abandoned bytes; this tool never deletes another active tab's workspaces automatically.

Normal queue cancellation cleans partial output. A worker crash returns an actionable error rather than a fake success. Completed outputs are kept until cleared or the page session ends; download them before leaving.

## Rust changes

Only if modifying the color kernel, install Rust and its `wasm32-unknown-unknown` target, then run:

```sh
rustup target add wasm32-unknown-unknown
node src/tools/video-editor/scripts/build-rust.mjs
```

Commit the updated Wasm alongside the matching Rust source. The ABI is versioned; normal npm installation and Vercel builds use the included binary.

## References and dependency notices

- [Mediabunny conversion API](https://mediabunny.dev/guide/converting-media-files)
- [mp4-muxer migration notice](https://github.com/Vanilagy/mp4-muxer)
- [FFmpeg Wasm architecture](https://ffmpegwasm.netlify.app/docs/overview/)
- [FFmpeg wrapper API](https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/)

See `licenses/THIRD-PARTY-NOTICES.txt`, published with the license texts at `/licenses`. FFmpeg core binaries are GPL-licensed; retain the notices and meet their corresponding-source distribution requirements. Rust sources in this tool do not require downloading a Rust runtime in production.

Future blueprint items—subtitles, merging, reverse/boomerang, chroma key, social preset library, PWA installation and opt-in recent projects—are not included in this v1 core implementation.
