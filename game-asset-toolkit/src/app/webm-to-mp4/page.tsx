import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import VideoTask from "@/tools/video-editor/VideoTask";

export const metadata = toolMetadata("webm-to-mp4");

export default function Page() {
  return <ToolPage id="webm-to-mp4" width="wide"><VideoTask key="webm-to-mp4" mode="convert" source="WebM" fixedFormat="mp4" /></ToolPage>;
}
