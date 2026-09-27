import type { NextConfig } from "next";

const isolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

/**
 * Preserve existing app headers; isolate only the video pages and the video
 * engine's assets under public/tools/video-editor/. Without these headers
 * FFmpeg falls back to single-thread mode.
 */
export function withVideoEditor(config: NextConfig, pages: readonly string[]): NextConfig {
  const originalHeaders = config.headers;
  return {
    ...config,
    async headers() {
      const previous = originalHeaders ? await originalHeaders.call(config) : [];
      return [
        ...previous,
        ...pages.map((source) => ({ source, headers: isolation })),
        { source: "/tools/video-editor/:path*", headers: isolation },
        // An isolated page may only start a dedicated worker whose script response
        // also sends COEP, and Next.js serves the video worker from its chunk folder.
        // COEP on ordinary script responses is ignored; CORP only stops other sites
        // from embedding these files.
        {
          source: "/_next/static/chunks/:path*",
          headers: [
            { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
            { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          ],
        },
      ];
    },
  };
}
