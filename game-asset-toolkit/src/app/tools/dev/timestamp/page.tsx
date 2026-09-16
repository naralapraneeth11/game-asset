import TimestampTool from "@/tools/developer/timestamp/TimestampTool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("timestamp");

export default function Page() {
  return <TimestampTool />;
}
