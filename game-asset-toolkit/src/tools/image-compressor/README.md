# Image Compressor

Native Game Asset Toolkit tool at `/tools/image-compressor`.

Prepare assets: `node src/tools/image-compressor/scripts/prepare.mjs`

Test: `node --test src/tools/image-compressor/tests/*.test.mjs` after preparing assets.

Build offline manifest: `node src/tools/image-compressor/scripts/offline-manifest.mjs` after a successful Next production build.

Codec WASM is generated at build time into `public/tools/image-compressor/`.
