import HashTool from "@/tools/developer/hash/HashTool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("hash-generator");

export default function Page() {
  return <HashTool />;
}
