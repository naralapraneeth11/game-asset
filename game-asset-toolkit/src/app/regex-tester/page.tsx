import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import RegexTool from "@/tools/developer/regex/RegexTool";

export const metadata = toolMetadata("regex-tester");

export default function Page() {
  return <ToolPage id="regex-tester" width="wide"><RegexTool /></ToolPage>;
}
