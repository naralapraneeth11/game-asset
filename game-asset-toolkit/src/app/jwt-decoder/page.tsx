import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import JwtTool from "@/tools/developer/jwt/JwtTool";

export const metadata = toolMetadata("jwt-decoder");

export default function Page() {
  return <ToolPage id="jwt-decoder" width="wide"><JwtTool /></ToolPage>;
}
