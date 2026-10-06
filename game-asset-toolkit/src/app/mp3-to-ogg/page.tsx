import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import GameAudioConverter from "@/tools/game-audio/GameAudioConverter";

export const metadata = toolMetadata("mp3-to-ogg");

export default function Page() {
  return <ToolPage id="mp3-to-ogg" width="wide"><GameAudioConverter key="mp3-to-ogg" input="mp3" /></ToolPage>;
}
