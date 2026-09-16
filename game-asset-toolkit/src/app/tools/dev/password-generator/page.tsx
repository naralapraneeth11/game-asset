import PasswordTool from "@/tools/developer/password/PasswordTool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("password-generator");

export default function Page() {
  return <PasswordTool />;
}
