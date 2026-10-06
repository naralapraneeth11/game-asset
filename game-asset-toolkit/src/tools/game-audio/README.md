# Game Audio Converter

Native Game Asset Toolkit file-tool UI for `/wav-to-ogg` and `/mp3-to-ogg`.

`GameAudioConverter` accepts `{ input: "wav" | "mp3" }`; this changes page-specific drop-zone copy. Both pages accept supported WAV, MP3, OGG, Opus, AAC, M4A, FLAC and AIFF sources. Output is an actual Ogg container containing Vorbis audio, not a renamed file. The engine checks for `libvorbis` at runtime and reports an actionable error if it is missing.

## Integration

Use the package's integration instructions for routes and registry entries. This folder reuses the existing `components/tool` primitives, `components/ui/Toggle`, `lib/format`, and included `tools/local-files/download` helper. Its only codec dependency is the existing `@ffmpeg/ffmpeg` 0.12.15 wrapper and pinned 0.12.10 core assets served at `/tools/video-editor/vendor`. Run the existing video asset preparation script during installation/build; do not replace assets with a CDN. Multi-threaded operation is used only when cross-origin isolation is available; single-threaded operation is the normal fallback.

## Behavior and boundaries

- One dedicated worker owns one FFmpeg instance and processes files serially. WORKERFS reads each local `File` without first copying it into an input ArrayBuffer.
- Standard FFmpeg output lives in WASM memory. Input is capped at 256 MiB, output at 128 MiB, retained results at 256 MiB and queue size at 20. These are safeguards, not a promise every device can process the maximum.
- Variable-bitrate quality 0–10, original/44.1/48 kHz, original/mono/stereo channels, trim, gain and optional dynamic loudness normalization are implemented. Only the first audio track is exported. Embedded metadata and chapters are removed.
- No browser content storage, audio uploads, external telemetry or API endpoints are introduced. Downloads and previews use temporary object URLs. Navigating away releases the worker and in-memory results.
- Cancelling sends a message that terminates FFmpeg's nested worker, then terminates the owner worker. A short forced-termination timeout handles unresponsive owner workers. Subsequent conversions get a fresh instance.
- The same options apply to every file in a batch. A zero end time means the source duration. A trim range outside any source raises a per-file error without stopping other files.
- Dynamic loudness normalization targets −16 LUFS / −1.5 dBTP, but is not a two-pass loudness certification. It can change dynamics; leave it off when preserving sound-effect relationships matters.
- Existing lossy audio cannot regain fidelity through transcoding. Seamless loop boundaries are the source's responsibility; loop metadata is not preserved. Browser Ogg preview support and game-engine import behavior vary.
- No tests, type checks or production builds were run for this delivery, per the requested workflow. Runtime file inspection and output validation are part of normal tool operation.

FFmpeg's license obligations also apply to its bundled codec build; preserve the existing video-tool license notices.
