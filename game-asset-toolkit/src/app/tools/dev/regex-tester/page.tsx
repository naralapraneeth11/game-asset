import RegexTool from "@/tools/developer/regex/RegexTool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("regex-tester");

export default function Page() {
  return <RegexTool />;
}
