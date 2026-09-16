import Base64Tool from "@/tools/developer/base64/Base64Tool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("base64");

export default function Page() {
  return <Base64Tool />;
}
