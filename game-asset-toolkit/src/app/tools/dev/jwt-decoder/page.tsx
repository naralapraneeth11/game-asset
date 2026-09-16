import JwtTool from "@/tools/developer/jwt/JwtTool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("jwt-decoder");

export default function Page() {
  return <JwtTool />;
}
