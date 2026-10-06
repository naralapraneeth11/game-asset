import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import ImageCompressor from "@/tools/image-compressor/ImageCompressor";

export const metadata = toolMetadata("webp-to-png");

export default function Page() {
  return <ToolPage id="webp-to-png" width="wide"><ImageCompressor key="webp-to-png" job="convert" sourceLabel="WebP images" initialSettings={{ format: "png", autoResize: false }} /></ToolPage>;
}
