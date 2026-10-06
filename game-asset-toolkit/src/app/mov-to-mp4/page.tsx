import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import VideoTask from "@/tools/video-editor/VideoTask";

export const metadata = toolMetadata("mov-to-mp4");

export default function Page() {
  return <ToolPage id="mov-to-mp4" width="wide"><VideoTask key="mov-to-mp4" mode="convert" source="MOV" fixedFormat="mp4" /></ToolPage>;
}
