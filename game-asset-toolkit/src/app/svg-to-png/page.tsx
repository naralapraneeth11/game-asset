import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import SvgPngSet from "@/tools/svg-png-set/SvgPngSet";

export const metadata = toolMetadata("svg-to-png");

export default function Page() {
  return <ToolPage id="svg-to-png"><SvgPngSet preset="custom" title="SVG to PNG Converter" /></ToolPage>;
}
