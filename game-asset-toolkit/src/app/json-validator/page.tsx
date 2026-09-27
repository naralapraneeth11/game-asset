import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import JsonTool from "@/tools/developer/json/JsonTool";

export const metadata = toolMetadata("json-validator");

export default function Page() {
  return <ToolPage id="json-validator" width="wide"><JsonTool validatorOnly /></ToolPage>;
}
