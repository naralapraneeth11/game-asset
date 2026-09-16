import UuidTool from "@/tools/developer/uuid/UuidTool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("uuid-generator");

export default function Page() {
  return <UuidTool />;
}
