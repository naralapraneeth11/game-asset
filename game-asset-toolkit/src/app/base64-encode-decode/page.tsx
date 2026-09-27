import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import Base64Tool from "@/tools/developer/base64/Base64Tool";

export const metadata = toolMetadata("base64-encode-decode");

export default function Page() {
  return <ToolPage id="base64-encode-decode" width="wide"><Base64Tool /></ToolPage>;
}
