import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import ColorTool from "@/tools/developer/color/ColorTool";

export const metadata = toolMetadata("color-converter");

export default function Page() {
  return <ToolPage id="color-converter"><ColorTool /></ToolPage>;
}
