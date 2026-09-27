import type { NextConfig } from "next";
import { withVideoEditor } from "./src/tools/video-editor/config/next";
import { LEGACY_REDIRECTS, VIDEO_ROUTES } from "./src/lib/routes";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return LEGACY_REDIRECTS.map((redirect) => ({ ...redirect, permanent: true }));
  },
};

export default withVideoEditor(nextConfig, VIDEO_ROUTES);
