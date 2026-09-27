import { hubMetadata } from "@/lib/seo";
import { CategoryHub } from "@/components/tool/CategoryHub";

export const metadata = hubMetadata("developer");

export default function Page() {
  return <CategoryHub id="developer" />;
}
