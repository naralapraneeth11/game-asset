import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import ImageCompressor from "@/tools/image-compressor/ImageCompressor";

export const metadata = toolMetadata("compress-png");

export default function Page() {
  return <ToolPage id="compress-png" width="wide"><ImageCompressor key="compress-png" job="compress" sourceLabel="PNG images" initialSettings={{ format: "png", autoResize: false }} /></ToolPage>;
}
