import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import TimestampTool from "@/tools/developer/timestamp/TimestampTool";

export const metadata = toolMetadata("unix-timestamp-converter");

export default function Page() {
  return <ToolPage id="unix-timestamp-converter"><TimestampTool /></ToolPage>;
}
