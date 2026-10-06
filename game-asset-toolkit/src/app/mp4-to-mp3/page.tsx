import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import VideoTask from "@/tools/video-editor/VideoTask";

export const metadata = toolMetadata("mp4-to-mp3");

export default function Page() {
  return <ToolPage id="mp4-to-mp3" width="wide"><VideoTask key="mp4-to-mp3" mode="audio" source="MP4" /></ToolPage>;
}
