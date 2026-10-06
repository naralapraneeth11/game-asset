import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import ImageCompressor from "@/tools/image-compressor/ImageCompressor";

export const metadata = toolMetadata("png-to-webp");

export default function Page() {
  return <ToolPage id="png-to-webp" width="wide"><ImageCompressor key="png-to-webp" job="convert" sourceLabel="PNG images" initialSettings={{ format: "webp", autoResize: false }} /></ToolPage>;
}
