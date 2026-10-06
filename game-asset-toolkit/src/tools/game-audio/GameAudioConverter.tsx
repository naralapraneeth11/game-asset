"use client";

import { useEffect, useId, useState } from "react";
import { AudioLines, Check, CircleAlert, LoaderCircle, Music2, Trash2, X } from "lucide-react";
import { DropZone } from "@/components/tool/DropZone";
import { AdvancedPanel } from "@/components/tool/AdvancedPanel";
import { ResultList } from "@/components/tool/ResultList";
import { buttonClass } from "@/components/tool/buttons";
import Toggle from "@/components/ui/Toggle";
import { formatBytes } from "@/lib/format";
import { downloadBlob } from "@/tools/local-files/download";
import { useGameAudio } from "./useGameAudio";
import type { AudioSettings } from "./types";

const field = "mt-2 block h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

function AudioPreview({ blob, name }: { blob: Blob; name: string }) {
  const [url, setUrl] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    const value = URL.createObjectURL(blob); setUrl(value); setUnsupported(false);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return <div className="w-full space-y-2">
    <audio controls preload="none" src={url || undefined} aria-label={`Preview ${name}`} className="h-10 w-full max-w-md" onError={() => setUnsupported(true)} />
    {unsupported && <p className="text-xs text-muted-foreground">This browser cannot preview OGG. Download the result to listen in your audio player or game engine.</p>}
  </div>;
}

export default function GameAudioConverter({ input = "wav" }: { input?: "wav" | "mp3" }) {
  const tool = useGameAudio();
  const id = useId();
  const locked = tool.busy || tool.zipBusy;
  const done = tool.items.filter((item) => item.result);
  const update = <K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) => tool.setSettings((settings) => ({ ...settings, [key]: value }));
  const total = tool.items.reduce((sum, item) => sum + item.file.size, 0);
  const qualityLabel = tool.settings.quality <= 2 ? "Compact" : tool.settings.quality <= 6 ? "Balanced" : "High fidelity";

  return <div className="space-y-5" onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !locked) { event.preventDefault(); void tool.convertAll(); } }}>
    <DropZone
      accept="audio/*,.wav,.wave,.mp3,.ogg,.oga,.opus,.aac,.m4a,.flac,.aiff,.aif"
      title={`Drop ${input.toUpperCase()} files to make game-ready OGG audio`}
      hint={tool.items.length ? "Add more audio · WAV, MP3, OGG, AAC, M4A, FLAC or AIFF" : "WAV, MP3, OGG, AAC, M4A, FLAC and AIFF · up to 256 MiB per file"}
      icon={<AudioLines className="h-6 w-6" aria-hidden />}
      compact={tool.items.length > 0}
      disabled={locked}
      buttonLabel="Choose audio files"
      onFiles={tool.addFiles}
    />

    <div className="sr-only" role="status" aria-live="polite">{tool.notice}</div>
    {tool.error && <p role="alert" className="rounded-xl border border-[var(--warning)] bg-card px-4 py-3 text-sm text-warning">{tool.error}</p>}

    {tool.items.length > 0 && <section aria-labelledby={`${id}-queue`} className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div>
          <h2 id={`${id}-queue`} className="text-sm font-semibold">{tool.items.length} audio file{tool.items.length === 1 ? "" : "s"} attached</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(total)} total · files are processed one at a time</p>
        </div>
        <button type="button" className={buttonClass("ghost", "sm")} disabled={locked} onClick={tool.clear}><Trash2 className="h-3.5 w-3.5" aria-hidden />Clear files</button>
      </div>
      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
        {tool.items.map((item) => <li key={item.id} className="px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden>{item.status === "processing" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : item.status === "done" ? <Check className="h-4 w-4 text-success" /> : item.status === "error" ? <CircleAlert className="h-4 w-4 text-warning" /> : <Music2 className="h-4 w-4" />}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={item.file.name}>{item.file.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(item.file.size)} · {item.phase}{item.status === "processing" && item.progress !== null ? ` · ${Math.round(item.progress * 100)}%` : ""}</p>
            </div>
            <button type="button" className={buttonClass("ghost", "sm")} aria-label={`Remove ${item.file.name}`} disabled={locked} onClick={() => tool.remove(item.id)}><X className="h-4 w-4" aria-hidden /></button>
          </div>
          {item.status === "processing" && <progress aria-label={`Converting ${item.file.name}`} className="mt-3 h-1.5 w-full accent-primary" max={1} value={item.progress ?? undefined} />}
          {item.error && <p role="alert" className="mt-2 break-words text-sm text-warning">{item.error}</p>}
        </li>)}
      </ul>
    </section>}

    <fieldset disabled={locked} className="min-w-0 space-y-5">
      <legend className="sr-only">OGG conversion settings</legend>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby={`${id}-quality`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id={`${id}-quality`} className="text-sm font-semibold">OGG / Vorbis</h2><p className="mt-1 text-[13px] text-muted-foreground">A familiar audio format for game music and sound effects.</p></div>
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">Variable bitrate</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="Quality presets">
          {[{ label: "Compact", quality: 2, detail: "Smaller assets" }, { label: "Balanced", quality: 5, detail: "Everyday game audio" }, { label: "High fidelity", quality: 8, detail: "Music and detail" }].map((preset) => <button type="button" key={preset.label} aria-pressed={tool.settings.quality === preset.quality} onClick={() => update("quality", preset.quality)} className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tool.settings.quality === preset.quality ? "border-accent bg-accent-soft" : "border-border bg-background hover:bg-muted"}`}>
            <span className="block text-[13px] font-semibold">{preset.label}</span><span className="mt-1 hidden text-xs text-muted-foreground sm:block">{preset.detail}</span>
          </button>)}
        </div>
        <label htmlFor={`${id}-quality-slider`} className="mt-5 flex justify-between gap-4 text-sm"><span>Quality</span><span className="tabular-nums text-muted-foreground">{qualityLabel} · {tool.settings.quality}/10</span></label>
        <input id={`${id}-quality-slider`} type="range" min={0} max={10} step={1} value={tool.settings.quality} onChange={(event) => update("quality", Number(event.target.value))} className="mt-3 w-full accent-primary" aria-valuetext={`${tool.settings.quality} out of 10, ${qualityLabel}`} />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Vorbis is lossy. Converting an MP3 cannot restore detail lost in the original; start from WAV or FLAC when possible. Quality controls bitrate, so final file size varies.</p>
      </section>

      <AdvancedPanel title="Audio options" summary={`${tool.settings.sampleRate ? `${tool.settings.sampleRate / 1000} kHz` : "Original sample rate"} · ${tool.settings.channels === 1 ? "Mono" : tool.settings.channels === 2 ? "Stereo" : "Original channels"}`}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium">Sample rate<select className={field} value={tool.settings.sampleRate} onChange={(event) => update("sampleRate", Number(event.target.value) as AudioSettings["sampleRate"])}><option value={0}>Keep original</option><option value={44100}>44.1 kHz</option><option value={48000}>48 kHz</option></select></label>
          <label className="text-sm font-medium">Channels<select className={field} value={tool.settings.channels} onChange={(event) => update("channels", Number(event.target.value) as AudioSettings["channels"])}><option value={0}>Keep original</option><option value={1}>Mono</option><option value={2}>Stereo</option></select></label>
          <label className="text-sm font-medium">Start time (seconds)<input type="number" min={0} step={0.01} className={field} value={tool.settings.start} onChange={(event) => update("start", event.target.value === "" ? 0 : Number(event.target.value))} /></label>
          <label className="text-sm font-medium">End time (seconds)<input type="number" min={0} step={0.01} className={field} value={tool.settings.end} onChange={(event) => update("end", event.target.value === "" ? 0 : Number(event.target.value))} /><span className="mt-1.5 block text-xs font-normal text-muted-foreground">0 uses the end of each source file.</span></label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">The same trim range and settings apply to every queued file.</p>
        <div className="mt-5 border-t border-border pt-5">
          <label htmlFor={`${id}-volume`} className="flex justify-between text-sm font-medium"><span>Volume</span><span className="tabular-nums text-muted-foreground">{Math.round(tool.settings.volume * 100)}%</span></label>
          <input id={`${id}-volume`} className="mt-3 w-full accent-primary" type="range" min={0} max={2} step={0.05} value={tool.settings.volume} onChange={(event) => update("volume", Number(event.target.value))} />
          <div className="mt-4 flex items-center justify-between gap-5">
            <div><label htmlFor={`${id}-normalize`} id={`${id}-normalize-label`} className="cursor-pointer text-sm font-medium">Normalize loudness</label><p id={`${id}-normalize-help`} className="mt-1 text-xs leading-relaxed text-muted-foreground">Dynamic adjustment toward −16 LUFS. Leave off to preserve the relative level of game sound effects.</p></div>
            <Toggle id={`${id}-normalize`} checked={tool.settings.normalize} disabled={locked} onChange={(checked) => update("normalize", checked)} aria-labelledby={`${id}-normalize-label`} aria-describedby={`${id}-normalize-help`} />
          </div>
        </div>
      </AdvancedPanel>
    </fieldset>

    <div className="flex flex-wrap items-center gap-3">
      {tool.busy ? <button type="button" className={buttonClass("secondary", "lg")} onClick={tool.cancel}><X className="h-4 w-4" aria-hidden />Cancel conversion</button> : <button type="button" className={buttonClass("primary", "lg")} disabled={!tool.items.length || tool.zipBusy} onClick={() => void tool.convertAll()}><AudioLines className="h-4 w-4" aria-hidden />{done.length ? "Convert again" : `Convert${tool.items.length > 1 ? ` ${tool.items.length} files` : ""} to OGG`}</button>}
      <p className="text-xs text-muted-foreground">{tool.busy ? "Keep this tab open while encoding." : "⌘ / Ctrl + Enter to convert"}</p>
    </div>
    {tool.notice && <p className="text-sm text-muted-foreground">{tool.notice}</p>}

    <ResultList title="OGG audio ready" compare={false} items={done.flatMap((item) => item.result ? [{ id: item.id, name: item.result.name, before: item.file.size, after: item.result.blob.size, detail: `${time(item.result.info.duration)} · ${item.result.info.sampleRate / 1000} kHz · ${item.result.info.channels === 1 ? "mono" : item.result.info.channels === 2 ? "stereo" : `${item.result.info.channels} channels`}`, warnings: item.result.warnings, onDownload: () => downloadBlob(item.result!.blob, item.result!.name) }] : [])} onDownloadAll={() => void tool.downloadAll()} downloadAllBusy={tool.zipBusy || tool.busy} footer="ZIP downloads are limited to 128 MiB combined. Download larger batches individually. Results stay in memory until you remove them or leave this page." />
    {done.length > 0 && <section aria-label="Listen to converted audio" className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Listen before you import</h2>
      {done.map((item) => item.result && <div key={item.id} className="space-y-2"><p className="truncate text-xs text-muted-foreground" title={item.result.name}>{item.result.name}</p><AudioPreview blob={item.result.blob} name={item.result.name} /></div>)}
      <p className="text-xs leading-relaxed text-muted-foreground">For seamless loops, make matching loop boundaries in your source and confirm playback in your game engine. This converter does not invent loop points or guarantee gapless playback.</p>
    </section>}
    <p className="text-xs leading-relaxed text-muted-foreground">Processing stays in your browser. The first conversion downloads this site’s audio-engine code, never your audio. Up to 20 files per queue; 256 MiB per source and 128 MiB per output. Device memory may impose lower limits.</p>
  </div>;
}
