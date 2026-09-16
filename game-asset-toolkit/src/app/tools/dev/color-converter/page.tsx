import ColorTool from "@/tools/developer/color/ColorTool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("color-converter");

export default function Page() {
  return <ColorTool />;
}
