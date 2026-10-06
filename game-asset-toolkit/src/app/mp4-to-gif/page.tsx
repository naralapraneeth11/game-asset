import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import VideoTask from "@/tools/video-editor/VideoTask";

export const metadata = toolMetadata("mp4-to-gif");

export default function Page() {
  return <ToolPage id="mp4-to-gif" width="wide"><VideoTask key="mp4-to-gif" mode="gif" source="MP4" /></ToolPage>;
}
