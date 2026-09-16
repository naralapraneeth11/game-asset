import UrlTool from "@/tools/developer/url/UrlTool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("url-encode");

export default function Page() {
  return <UrlTool />;
}
