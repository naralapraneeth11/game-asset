import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import VideoTool from "@/tools/video-editor/VideoTool";

export const metadata = toolMetadata("video-converter");

export default function Page() {
  return <ToolPage id="video-converter"><VideoTool mode="convert" /></ToolPage>;
}
