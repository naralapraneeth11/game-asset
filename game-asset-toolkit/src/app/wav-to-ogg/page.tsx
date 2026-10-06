import { toolMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/tool/ToolPage";
import GameAudioConverter from "@/tools/game-audio/GameAudioConverter";

export const metadata = toolMetadata("wav-to-ogg");

export default function Page() {
  return <ToolPage id="wav-to-ogg" width="wide"><GameAudioConverter key="wav-to-ogg" input="wav" /></ToolPage>;
}
