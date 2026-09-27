import { hubMetadata } from "@/lib/seo";
import { CategoryHub } from "@/components/tool/CategoryHub";

export const metadata = hubMetadata("game-dev");

export default function Page() {
  return <CategoryHub id="game-dev" />;
}
