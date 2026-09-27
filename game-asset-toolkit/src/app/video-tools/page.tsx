import { hubMetadata } from "@/lib/seo";
import { CategoryHub } from "@/components/tool/CategoryHub";

export const metadata = hubMetadata("video");

export default function Page() {
  return <CategoryHub id="video" />;
}
