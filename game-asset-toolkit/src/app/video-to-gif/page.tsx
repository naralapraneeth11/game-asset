import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import VideoTool from "@/tools/video-editor/VideoTool";

export const metadata = toolMetadata("video-to-gif");

export default function Page() {
  return <ToolPage id="video-to-gif"><VideoTool mode="gif" /></ToolPage>;
}
