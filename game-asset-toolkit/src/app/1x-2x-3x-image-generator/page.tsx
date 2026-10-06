import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import PixelArtScaler from "@/tools/pixel-art-scaler/PixelArtScaler";

export const metadata = toolMetadata("1x-2x-3x-image-generator");

export default function Page() {
  return <ToolPage id="1x-2x-3x-image-generator" width="wide"><PixelArtScaler key="1x-2x-3x-image-generator" mode="density" /></ToolPage>;
}
