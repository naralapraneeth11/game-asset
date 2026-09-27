import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import SpritePacker from "@/tools/sprite-packer/SpritePacker";

export const metadata = toolMetadata("sprite-sheet-packer");

export default function Page() {
  return <ToolPage id="sprite-sheet-packer" width="narrow"><SpritePacker /></ToolPage>;
}
