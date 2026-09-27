import VideoEditor from "./VideoEditor";
import VideoTask, { type VideoTaskMode } from "./VideoTask";

/**
 * One engine (useVideoEditor, the worker, WebCodecs + FFmpeg), four task
 * pages. The mode decides which controls each page shows.
 */
export default function VideoTool({ mode }: { mode: VideoTaskMode | "editor" }) {
  return mode === "editor" ? <VideoEditor /> : <VideoTask mode={mode} />;
}
