import type { NextConfig } from "next";

/** Preserve existing app headers; isolate only the video route and its assets. */
export function withVideoEditor(config: NextConfig): NextConfig {
  const originalHeaders = config.headers;
  return {
    ...config,
    async headers() {
      const previous = originalHeaders ? await originalHeaders.call(config) : [];
      return [
        ...previous,
        {
          source: "/tools/video-editor/:path*",
          headers: [
            { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
            { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
            { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          ],
        },
      ];
    },
  };
}
