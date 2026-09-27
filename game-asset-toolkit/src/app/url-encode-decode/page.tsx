import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import UrlTool from "@/tools/developer/url/UrlTool";

export const metadata = toolMetadata("url-encode-decode");

export default function Page() {
  return <ToolPage id="url-encode-decode" width="wide"><UrlTool /></ToolPage>;
}
