# Video Editor · Game Asset Toolkit

Local video editing at `/tools/video-editor`, integrated with the existing app shell, theme variables, Lucide icons, orange Toggle, sidebar registry and Next.js routing.

## Install in your existing app

1. Extract the ZIP. Merge its `game-asset-toolkit/src` and `game-asset-toolkit/public` folders into your existing `game-asset-toolkit` folder. The archive contains only the new video tool and route; keep your other app files.
2. Open a terminal in your existing `game-asset-toolkit` folder and run:

   ```sh
   node src/tools/video-editor/scripts/integrate.mjs
   ```

   This updates `package.json`, `src/lib/tools.ts`, `next.config.ts`, and `.gitignore`. It preserves existing build hooks and headers, checks recognizable file structures before changing anything, and backs up edited files under `.video-editor-backups/`. Running it again is safe. It does not access GitHub or install anything.
3. Use your existing package manager. If the project uses `pnpm-lock.yaml`, run `pnpm install`; if it uses `package-lock.json`, run `npm install`. Commit the updated lockfile. Do not switch package managers just for this tool.
4. Run your normal development command and open `/tools/video-editor`. Use HTTPS or localhost. Commit the new files, the four integration edits, and the updated lockfile when ready.

Installation and build hooks prepare the FFmpeg assets automatically. If package scripts are disabled by your environment, run `npm run prepare:video-editor` explicitly before building. The command also works through pnpm. Do not use a frozen lockfile for the first install after adding dependencies; update and commit it first.

**Rust does not need to be installed to run or deploy this release.** The compiled `public/tools/video-editor/pixel-ops.wasm` is included and must be committed. Large FFmpeg assets are generated from pinned npm dependencies; do not upload them individually through GitHub's browser uploader.

Set `NEXT_PUBLIC_SITE_URL=https://your-domain.example` for a custom canonical domain. Vercel's production URL is used when that variable is absent.

## If integrating by hand

Keep all existing dependencies and add these exact versions:

```json
{
  "@ffmpeg/ffmpeg": "0.12.15",
  "@ffmpeg/core": "0.12.10",
  "@ffmpeg/core-mt": "0.12.10",
  "mediabunny": "1.56.3",
  "comlink": "4.4.2",
  "fflate": "0.8.2"
}
```

Add `prepare:video-editor` to package scripts with value `node src/tools/video-editor/scripts/prepare.mjs`. Run that command before the existing `dev` and `build` scripts, and append it to the existing `postinstall` with `&&`. Preserve the image compressor's preparation and offline-manifest hooks. Update the lockfile using your existing package manager.

In `next.config.ts`, import and wrap the existing config:

```ts
import { withVideoEditor } from "./src/tools/video-editor/config/next";
// Keep your existing nextConfig object and its options.
export default withVideoEditor(nextConfig);
```

In `src/lib/tools.ts`, add `Film` to the Lucide import, add `"video"` to `ToolCategory`, and add these entries to the existing arrays:

```ts
// categories
{ id: "video", label: "Video Tools", description: "Edit, compress, convert" }

// tools
{
  id: "video-editor",
  name: "Video Editor & Converter",
  shortName: "Video Editor",
  description: "Trim, resize, edit, compress and convert video locally",
  href: "/tools/video-editor",
  icon: Film,
  category: "video",
  keywords: ["video", "convert", "compress", "trim", "mp4", "webm", "gif", "audio"],
  suggested: true,
}
```

The existing sidebar reads the registry automatically. The tool also appears in Suggested. If you want the Video category expanded initially, add `video: true` to the sidebar's existing expanded-state initializer.

Add these paths to `.gitignore`:

```gitignore
/public/tools/video-editor/vendor/
/.video-editor-backups/
/.toolchains/
/src/tools/video-editor/rust/pixel-ops/target/
```

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

Cmd/Ctrl + Enter exports the selected file. Escape cancels the current operation. Space toggles playback when the preview frame has focus. Arrow keys seek in the focused preview; arrows on text/watermark move it 1%, or 5% with Shift. Numeric crop controls provide keyboard alternatives to pointer handles.

Batch files share the current settings. Trim-out is bounded by each source duration; a trim-in beyond a shorter file's duration produces a file-specific error. A previously exported result remains available if a later export fails; it reflects the settings used for that successful export.

## Architecture

```text
src/app/tools/video-editor/page.tsx       Server route and SEO metadata
src/tools/video-editor/
  VideoEditor.tsx / .module.css           Native application UI and themes
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
  scripts/                              Integration, asset preparation, optional Rust build
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
- GIF: up to 30 seconds, 640 px wide, 15 fps. GIF uses a palette, not the video quality/target-size controls.
- Target MB is a bitrate estimate, not an exact or maximum-size promise. Very small targets are rejected. Audio-only and GIF exports ignore the video target size.
- AV1 is available only when the browser's native encoder works for the requested configuration. The bundled FFmpeg build does not provide an AV1 encoder. Hardware acceleration is not promised by a positive support check.
- SDR output only. HDR/wide-gamut video editing and frame extraction are rejected instead of silently changing colors; audio extraction is still possible.
- Only the primary video and audio tracks are exported. Subtitles, attachments and secondary tracks are omitted. Metadata is stripped. Native video alpha is flattened. Compatibility audio exports at 48 kHz stereo, with 128 kbps for compressed formats; WAV is PCM.
- The live preview uses the browser's video player. Some sources can export through FFmpeg even when the player cannot preview them. Some exported codecs also require another player for playback.
- FFmpeg multithreading requires cross-origin isolation and SharedArrayBuffer. Headers are scoped to the video route. Next.js client navigation can retain the previous page's isolation state; reloading the video URL may enable threading. Single-thread fallback remains available.
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

## Validation performed

- TypeScript checked against the installed dependencies and the existing app snapshot.
- Next.js 15.5.25 production compilation, route generation and type validation passed after fixing the FFmpeg package's runtime enum-export mismatch.
- Asset preparation completed using the pinned packages.
- Rust kernel identity, alpha-preservation and bounds checks passed; the compiled module is included.
- Bundled FFmpeg encoder availability was inspected by running the installed core.

This release has not completed a cross-browser, real-media acceptance matrix. Check your representative source files, audio synchronization, mobile memory behavior and output playback on your deployment before describing it as production-certified. The integration was built from the existing local app snapshot; it does not replace or fetch your current GitHub project.

## References and dependency notices

- [Mediabunny conversion API](https://mediabunny.dev/guide/converting-media-files)
- [mp4-muxer migration notice](https://github.com/Vanilagy/mp4-muxer)
- [FFmpeg Wasm architecture](https://ffmpegwasm.netlify.app/docs/overview/)
- [FFmpeg wrapper API](https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/)

See `licenses/THIRD-PARTY-NOTICES.txt`. FFmpeg core binaries are GPL-licensed; retain the notices and meet their corresponding-source distribution requirements. Rust sources in this tool do not require downloading a Rust runtime in production.

Future blueprint items—subtitles, merging, reverse/boomerang, chroma key, social preset library, PWA installation and opt-in recent projects—are not included in this v1 core implementation.
