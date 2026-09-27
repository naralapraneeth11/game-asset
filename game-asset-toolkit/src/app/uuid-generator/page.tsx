import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import UuidTool from "@/tools/developer/uuid/UuidTool";

export const metadata = toolMetadata("uuid-generator");

export default function Page() {
  return <ToolPage id="uuid-generator"><UuidTool /></ToolPage>;
}
