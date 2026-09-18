import type { NextConfig } from "next";
import { withVideoEditor } from "./src/tools/video-editor/config/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withVideoEditor(nextConfig);
