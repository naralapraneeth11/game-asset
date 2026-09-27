import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import PasswordTool from "@/tools/developer/password/PasswordTool";

export const metadata = toolMetadata("password-generator");

export default function Page() {
  return <ToolPage id="password-generator"><PasswordTool /></ToolPage>;
}
