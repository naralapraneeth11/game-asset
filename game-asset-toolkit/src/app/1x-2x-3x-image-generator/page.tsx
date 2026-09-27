import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import ImageScaler from "@/tools/image-scaler/ImageScaler";

export const metadata = toolMetadata("1x-2x-3x-image-generator");

export default function Page() {
  return <ToolPage id="1x-2x-3x-image-generator" width="narrow"><ImageScaler /></ToolPage>;
}
