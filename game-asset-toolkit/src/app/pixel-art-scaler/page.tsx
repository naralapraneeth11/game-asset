import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import PixelArtScaler from "@/tools/pixel-art-scaler/PixelArtScaler";

export const metadata = toolMetadata("pixel-art-scaler");

export default function Page() {
  return <ToolPage id="pixel-art-scaler" width="wide"><PixelArtScaler key="pixel-art-scaler" mode="pixel" /></ToolPage>;
}
