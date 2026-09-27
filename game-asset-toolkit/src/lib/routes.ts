/**
 * Route data shared by next.config.ts and the app. Keep this file free of
 * imports: next.config.ts loads it before the app is compiled.
 */

/**
 * Pages that run FFmpeg multi-threaded. They need COOP/COEP headers, or FFmpeg
 * drops to single-thread mode. Must match the tools marked `isolated` in
 * src/lib/tools.ts.
 */
export const VIDEO_ROUTES = ["/video-compressor", "/video-converter", "/video-to-gif", "/video-editor"] as const;

/**
 * Permanent redirects from pre-launch URLs, in case a preview link was shared.
 * After launch, every renamed or removed page needs an entry here.
 *
 * Old asset folders under /tools/image-compressor/ and /tools/video-editor/
 * are still served from public/, so only the exact page paths redirect.
 */
export const LEGACY_REDIRECTS: readonly { source: string; destination: string }[] = [
  { source: "/tools/image-compressor", destination: "/image-compressor" },
  { source: "/tools/svg-png-set", destination: "/svg-to-png" },
  { source: "/tools/sprite-packer", destination: "/sprite-sheet-packer" },
  { source: "/tools/video-editor", destination: "/video-editor" },
  // Mockups that are hidden until their engines ship: send visitors to the hub.
  { source: "/tools/1x-2x-3x-converter", destination: "/game-dev-tools" },
  { source: "/tools/3d-converter", destination: "/game-dev-tools" },
  { source: "/tools/batch-export", destination: "/game-dev-tools" },
  { source: "/tools/dev", destination: "/developer-tools" },
  { source: "/tools/dev/json-formatter", destination: "/json-formatter" },
  { source: "/tools/dev/json-validator", destination: "/json-validator" },
  { source: "/tools/dev/base64", destination: "/base64-encode-decode" },
  { source: "/tools/dev/url-encode", destination: "/url-encode-decode" },
  { source: "/tools/dev/jwt-decoder", destination: "/jwt-decoder" },
  { source: "/tools/dev/hash-generator", destination: "/hash-generator" },
  { source: "/tools/dev/password-generator", destination: "/password-generator" },
  { source: "/tools/dev/uuid-generator", destination: "/uuid-generator" },
  { source: "/tools/dev/timestamp", destination: "/unix-timestamp-converter" },
  { source: "/tools/dev/regex-tester", destination: "/regex-tester" },
  { source: "/tools/dev/color-converter", destination: "/color-converter" },
  { source: "/tools", destination: "/" },
];
