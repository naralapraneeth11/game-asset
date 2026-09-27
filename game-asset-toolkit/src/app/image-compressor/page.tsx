import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import ImageCompressor from "@/tools/image-compressor/ImageCompressor";

export const metadata = toolMetadata("image-compressor");

export default function Page() {
  return <ToolPage id="image-compressor" width="narrow"><ImageCompressor /></ToolPage>;
}
