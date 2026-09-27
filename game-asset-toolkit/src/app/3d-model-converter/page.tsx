import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import ModelConverter from "@/tools/3d-converter/ModelConverter";

export const metadata = toolMetadata("3d-model-converter");

export default function Page() {
  return <ToolPage id="3d-model-converter" width="narrow"><ModelConverter /></ToolPage>;
}
