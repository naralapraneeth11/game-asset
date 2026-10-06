import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import ImageCompressor from "@/tools/image-compressor/ImageCompressor";

export const metadata = toolMetadata("jpg-to-png");

export default function Page() {
  return <ToolPage id="jpg-to-png" width="wide"><ImageCompressor key="jpg-to-png" job="convert" sourceLabel="JPG images" initialSettings={{ format: "png", autoResize: false }} /></ToolPage>;
}
