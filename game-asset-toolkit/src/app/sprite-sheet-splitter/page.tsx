import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import SpriteUtilities from "@/tools/sprite-utilities/SpriteUtilities";

export const metadata = toolMetadata("sprite-sheet-splitter");

export default function Page() {
  return <ToolPage id="sprite-sheet-splitter" width="wide"><SpriteUtilities key="sprite-sheet-splitter" mode="split" /></ToolPage>;
}
