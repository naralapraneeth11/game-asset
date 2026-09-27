import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import SvgPngSet from "@/tools/svg-png-set/SvgPngSet";

export const metadata = toolMetadata("favicon-generator");

export default function Page() {
  return <ToolPage id="favicon-generator"><SvgPngSet preset="web" title="Favicon Generator" /></ToolPage>;
}
