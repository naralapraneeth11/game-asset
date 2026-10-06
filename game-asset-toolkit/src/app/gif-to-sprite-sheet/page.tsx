import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import SpriteUtilities from "@/tools/sprite-utilities/SpriteUtilities";

export const metadata = toolMetadata("gif-to-sprite-sheet");

export default function Page() {
  return <ToolPage id="gif-to-sprite-sheet" width="wide"><SpriteUtilities key="gif-to-sprite-sheet" mode="gif" /></ToolPage>;
}
