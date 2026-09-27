import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import HashTool from "@/tools/developer/hash/HashTool";

export const metadata = toolMetadata("hash-generator");

export default function Page() {
  return <ToolPage id="hash-generator" width="wide"><HashTool /></ToolPage>;
}
