import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import SvgPngSet from "@/tools/svg-png-set/SvgPngSet";

export const metadata = toolMetadata("app-icon-generator");

export default function Page() {
  return <ToolPage id="app-icon-generator"><SvgPngSet preset="apple" title="App Icon Generator" /></ToolPage>;
}
