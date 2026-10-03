"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, Check, Film, LoaderCircle, Share2, Trash2, X } from "lucide-react";
import { DropZone } from "@/components/tool/DropZone";
import { PresetPicker, type PresetOption } from "@/components/tool/PresetPicker";
import { AdvancedPanel } from "@/components/tool/AdvancedPanel";
import { ResultList, type ResultItem } from "@/components/tool/ResultList";
import { buttonClass } from "@/components/tool/buttons";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useVideoEditor } from "./useVideoEditor";
import { Capabilities } from "./components/Capabilities";
import { VIDEO_ACCEPT, describeExport } from "./describe";
import { Field, NumberField, Slider, Switch, bytes, time } from "./components/Controls";
import { LIMITS, type Container, type QueueItem, type VideoCodec, type VideoSettings } from "./types";
import s from "./VideoEditor.module.css";

export type VideoTaskMode = "compress" | "convert" | "gif";

const modes = {
  compress: { verb: "Compress", doing: "Compressing", suffix: "compressed", initial: { format: "mp4", codec: "h264", resolution: 1080, quality: 0.72 } },
  convert: { verb: "Convert", doing: "Converting", suffix: "converted", initial: { format: "mp4", codec: "h264", resolution: 0, quality: 0.8 } },
  gif: { verb: "Make GIF", doing: "Making GIF", suffix: "", initial: { format: "gif", resolution: 0, fps: 15, gifWidth: 480 } },
} satisfies Record<VideoTaskMode, { verb: string; doing: string; suffix: string; initial: Partial<VideoSettings> }>;

// Compressor presets on today's settings fields. Tune against real clips.
const compressPresets = [
  { value: "smaller", label: "Smaller", hint: "720p · for chat and email", patch: { resolution: 720, quality: 0.5 } },
  { value: "balanced", label: "Balanced", hint: "Up to 1080p · looks like the original", patch: { resolution: 1080, quality: 0.72 } },
  { value: "best", label: "Best quality", hint: "Original resolution", patch: { resolution: 0, quality: 0.85 } },
] as const;
const targetSizes = [10, 25, 50] as const;

const convertTargets: { value: Container; label: string; hint: string }[] = [
  { value: "mp4", label: "MP4", hint: "Plays everywhere" },
  { value: "webm", label: "WebM", hint: "For websites" },
  { value: "mov", label: "MOV", hint: "For Apple apps" },
  { value: "gif", label: "GIF", hint: "Silent loop, 30 s max" },
  { value: "mp3", label: "MP3", hint: "Audio only" },
];
const gifWidths: readonly PresetOption<number>[] = [
  { value: 320, label: "320 px", hint: "Small · chat and docs" },
  { value: 480, label: "480 px", hint: "Balanced" },
  { value: 640, label: "640 px", hint: "Largest GIF size" },
];

const isAudio = (format: Container) => format === "mp3" || format === "wav" || format === "aac";
const codecsFor = (format: Container): VideoCodec[] => (format === "webm" ? ["vp9", "av1"] : format === "mov" ? ["h264", "hevc"] : ["h264", "hevc", "av1"]);
const codecNames: Record<VideoCodec, string> = { h264: "H.264 · Widest compatibility", hevc: "HEVC · Smaller files", vp9: "VP9 · Open web video", av1: "AV1 · Needs a browser encoder" };

function statusText(item: QueueItem) {
  if (item.status === "reading") return "Reading…";
  if (item.status === "processing") return item.phase || "Working…";
  if (item.status === "done") return "Done";
  if (item.status === "cancelled") return "Cancelled";
  if (item.status === "error") return "Needs attention";
  return "Ready";
}

/** Video Compressor, Video Converter and Video to GIF: one engine, three task pages. */
export default function VideoTask({ mode }: { mode: VideoTaskMode }) {
  const config = modes[mode];
  const editor = useVideoEditor({ initialSettings: config.initial, suffix: config.suffix, shortcut: "all" });
  const { items, settings, setSettings, busy, capabilities } = editor;
  const [localError, setLocalError] = useState("");
  const [zipBusy, setZipBusy] = useState(false);
  const ready = items.filter((item) => item.info && item.status !== "reading");
  const done = items.filter((item) => item.result);
  const active = items.find((item) => item.status === "processing");
  const current = items.find((item) => item.id === editor.selectedId) || items[0];

  const update = <K extends keyof VideoSettings>(key: K, value: VideoSettings[K]) => setSettings((old) => ({ ...old, [key]: value }));
  const act = (operation: () => void | Promise<void>) => {
    setLocalError("");
    void Promise.resolve().then(operation).catch((error: unknown) => setLocalError(error instanceof Error ? error.message : "That did not work. Please try again."));
  };
  const addFiles = (files: File[]) => act(() => editor.addFiles(files));
  const setFormat = (format: Container) => setSettings((old) => ({
    ...old,
    format,
    mute: isAudio(format) ? false : old.mute,
    codec: format === "webm" ? (old.codec === "av1" ? "av1" : "vp9") : old.codec === "vp9" || (format === "mov" && old.codec === "av1") ? "h264" : old.codec,
  }));

  // A long clip can't become a GIF; start with its first ten seconds.
  useEffect(() => {
    const duration = current?.info?.duration;
    if (mode !== "gif" || !duration || duration <= LIMITS.gifSeconds) return;
    setSettings((old) => (old.trimEnd ? old : { ...old, trimStart: 0, trimEnd: Math.min(10, duration) }));
  }, [mode, current?.id, current?.info?.duration, setSettings]);

  const preset = compressPresets.find((option) => option.patch.resolution === settings.resolution && option.patch.quality === settings.quality)?.value ?? null;
  const count = ready.length;
  const primaryLabel = mode === "gif" ? (count > 1 ? `Make ${count} GIFs` : "Make GIF") : `${config.verb} ${count ? plural(count, "video") : "videos"}`;
  const summary = describeExport(settings);

  const results: ResultItem[] = done.map((item) => ({
    id: item.id,
    name: item.result!.filename,
    before: item.file.size,
    after: item.result!.blob.size,
    detail: item.result!.width > 0 ? `${item.result!.width} × ${item.result!.height} · ${time(item.result!.duration)}` : time(item.result!.duration),
    warnings: item.result!.warnings.filter((warning) => !/^Compatibility (engine|mode|audio)/.test(warning)),
    onDownload: () => editor.save(item.id),
    actions: typeof navigator !== "undefined" && "share" in navigator
      ? <button type="button" className={buttonClass("ghost", "sm", "w-8 px-0")} aria-label={`Share ${item.result!.filename}`} onClick={() => act(() => editor.share(item.id))}><Share2 className="h-3.5 w-3.5" aria-hidden /></button>
      : undefined,
  }));

  const noAudio = isAudio(settings.format) ? ready.filter((item) => !item.info?.hasAudio) : [];

  return (
    <div className={cn(s.root, s.workspace, "space-y-5")}>
      {!items.length ? (
        <DropZone
          accept={VIDEO_ACCEPT}
          multiple={mode !== "gif"}
          disabled={busy}
          onFiles={addFiles}
          title={mode === "gif" ? "Drop a video to turn into a GIF" : `Drop videos to ${config.verb.toLowerCase()}`}
          hint={mode === "gif" ? "MP4, MOV, WebM and more. Pick up to 30 seconds." : "MP4, MOV, WebM, MKV and more · up to 20 files"}
          icon={<Film className="h-6 w-6" strokeWidth={1.6} aria-hidden />}
          buttonLabel={mode === "gif" ? "Choose a video" : "Choose videos"}
        />
      ) : (
        <FileQueue items={items} busy={busy} selectedId={current?.id} onSelect={mode === "gif" ? editor.select : undefined} onRemove={editor.remove} onClear={() => act(editor.clear)}>
          <DropZone accept={VIDEO_ACCEPT} multiple={mode !== "gif"} disabled={busy || items.length >= LIMITS.queue} onFiles={addFiles} title="Add videos" compact hint={mode === "gif" ? "Drop another video" : "Drop more videos here"} className="rounded-none border-0 border-t border-solid" />
        </FileQueue>
      )}

      {mode === "gif" && current?.info && (
        <ClipRange item={current} settings={settings} setStart={(value) => update("trimStart", value)} setEnd={(value) => update("trimEnd", value)} disabled={busy} />
      )}

      <fieldset disabled={busy} className="space-y-4">
        <legend className="sr-only">Settings</legend>
        {mode === "compress" && (
          <>
            <PresetPicker
              label="Compression"
              options={compressPresets}
              value={preset}
              onChange={(value) => { const option = compressPresets.find((entry) => entry.value === value); if (option) setSettings((old) => ({ ...old, ...option.patch })); }}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-sm text-muted-foreground">Target size <span className="text-xs">(optional)</span></span>
              <PresetPicker
                size="sm"
                allowEmpty
                label="Target size"
                options={targetSizes.map((value): PresetOption<number> => ({ value, label: `${value} MB` }))}
                value={targetSizes.includes(settings.targetMB as (typeof targetSizes)[number]) ? settings.targetMB : null}
                onChange={(value) => update("targetMB", value ?? 0)}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Other
                <span className={s.numberWrap} style={{ width: 96 }}>
                  <input type="number" min={0} max={4096} step={1} inputMode="numeric" aria-label="Custom target size in MB" value={settings.targetMB && !targetSizes.includes(settings.targetMB as (typeof targetSizes)[number]) ? settings.targetMB : ""} placeholder="—" onChange={(event) => update("targetMB", Math.max(0, Math.min(4096, Number(event.target.value) || 0)))} />
                  <span>MB</span>
                </span>
              </label>
            </div>
            {settings.targetMB > 0 && <p className="text-xs text-muted-foreground">Aims for about {settings.targetMB} MB per video, overriding the quality preset. Very long clips may need trimming or no audio to fit.</p>}
          </>
        )}

        {mode === "convert" && (
          <>
            <p className="text-sm font-medium">Convert to</p>
            <PresetPicker
              label="Convert to"
              className="sm:grid-cols-5"
              options={convertTargets}
              value={isAudio(settings.format) ? "mp3" : settings.format}
              onChange={(value) => value && setFormat(value)}
            />
            {settings.format === "gif" && (
              <p className="text-xs text-muted-foreground">GIFs have no sound and are limited to 30 seconds. To choose which part becomes the GIF, use <Link href="/video-to-gif" className="underline underline-offset-4">Video to GIF</Link>.</p>
            )}
          </>
        )}

        {mode === "gif" && (
          <PresetPicker label="GIF width" options={gifWidths} value={settings.gifWidth} onChange={(value) => value && update("gifWidth", value)} />
        )}

        {noAudio.length > 0 && (
          <p className={s.inlineWarning}>No audio track was detected in {noAudio.map((item) => item.file.name).join(", ")}. Audio export needs a file with sound.</p>
        )}
      </fieldset>

      <PrimaryBar
        busy={busy}
        active={active}
        message={editor.message}
        label={primaryLabel}
        disabled={!count}
        onRun={() => act(editor.exportAll)}
        onCancel={editor.cancel}
        progressLabel={active ? `${config.doing} ${ready.findIndex((item) => item.id === active.id) + 1} of ${ready.length}` : undefined}
      />

      {(localError || editor.error) && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_45%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--card))] px-4 py-3.5 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
          <p className="leading-relaxed">{localError || editor.error}</p>
        </div>
      )}

      <ResultList
        items={results}
        onDownloadAll={() => { setZipBusy(true); act(async () => { try { await editor.saveAll(); } finally { setZipBusy(false); } }); }}
        downloadAllBusy={zipBusy || busy}
        compare={mode === "compress"}
        footer="Results stay in this tab until you save them."
      />

      <AdvancedPanel summary={summary}>
        <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
          <legend className="sr-only">Advanced settings</legend>
          {mode === "compress" && (
            <Field label="Format">
              <select aria-label="Output format" value={settings.format} onChange={(event) => setFormat(event.target.value as Container)}>
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
                <option value="mov">MOV</option>
              </select>
            </Field>
          )}
          {mode === "convert" && isAudio(settings.format) && (
            <Field label="Audio format">
              <select aria-label="Audio format" value={settings.format} onChange={(event) => setFormat(event.target.value as Container)}>
                <option value="mp3">MP3 · smallest, plays everywhere</option>
                <option value="aac">AAC · better quality per MB</option>
                <option value="wav">WAV · uncompressed</option>
              </select>
            </Field>
          )}
          {mode !== "gif" && !isAudio(settings.format) && settings.format !== "gif" && (
            <>
              <Field label="Codec">
                <select aria-label="Video codec" value={settings.codec} onChange={(event) => update("codec", event.target.value as VideoCodec)}>
                  {codecsFor(settings.format).map((codec) => (
                    <option key={codec} value={codec} disabled={codec === "av1" && !capabilities?.native.av1}>{codecNames[codec]}{codec === "av1" && !capabilities?.native.av1 ? " · Unavailable" : ""}</option>
                  ))}
                </select>
              </Field>
              <Field label="Resolution">
                <select aria-label="Output resolution" value={settings.resolution} onChange={(event) => update("resolution", Number(event.target.value))}>
                  <option value={0}>Original</option>
                  <option value={1080}>Up to 1080p</option>
                  <option value={720}>Up to 720p</option>
                  <option value={480}>Up to 480p</option>
                </select>
              </Field>
              <Field label="Frame rate">
                <select aria-label="Output frame rate" value={settings.fps} onChange={(event) => update("fps", Number(event.target.value))}>
                  {[24, 25, 30, 60].map((fps) => <option key={fps} value={fps}>{fps} fps</option>)}
                </select>
              </Field>
              <Slider label="Quality" value={settings.quality * 100} min={10} max={100} step={1} suffix="%" disabled={settings.targetMB > 0} onChange={(value) => update("quality", value / 100)} />
              {mode === "compress" && <Switch label="Remove audio" description="Export a silent video. Saves space on long clips." value={settings.mute} onChange={(value) => update("mute", value)} />}
            </>
          )}
          {(mode === "gif" || settings.format === "gif") && (
            <Field label="Frame rate" hint="Lower frame rates make smaller GIFs.">
              <select aria-label="GIF frame rate" value={Math.min(settings.fps, 15)} onChange={(event) => update("fps", Number(event.target.value))}>
                {[10, 12, 15].map((fps) => <option key={fps} value={fps}>{fps} fps</option>)}
              </select>
            </Field>
          )}
          {mode === "convert" && settings.format === "gif" && (
            <Field label="GIF width">
              <select aria-label="GIF width" value={settings.gifWidth} onChange={(event) => update("gifWidth", Number(event.target.value))}>
                {gifWidths.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
          )}
          <p className={cn(s.hint, "sm:col-span-2")}>Resolution never upscales the source. Everything is processed on this device, one file at a time.</p>
        </fieldset>
        {capabilities && <div className="mt-5"><Capabilities report={capabilities} /></div>}
      </AdvancedPanel>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{busy ? "" : editor.message}</div>
    </div>
  );
}

function FileQueue({ items, busy, selectedId, onSelect, onRemove, onClear, children }: {
  items: QueueItem[];
  busy: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <section aria-label="Your videos" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-medium">{plural(items.length, "video")}</h2>
        <button type="button" className={buttonClass("ghost", "sm")} disabled={busy} onClick={onClear}><Trash2 className="h-3.5 w-3.5" aria-hidden />Clear</button>
      </div>
      <ul className="divide-y divide-border border-t border-border">
        {items.map((item) => {
          const selectable = !!onSelect && items.length > 1;
          const content = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {item.status === "reading" || item.status === "processing" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : item.status === "done" ? <Check className="h-4 w-4 text-success" aria-hidden /> : item.status === "error" ? <AlertCircle className="h-4 w-4 text-danger" aria-hidden /> : <Film className="h-4 w-4" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium" title={item.file.name}>{item.file.name}</span>
                <span className="block text-[13px] text-muted-foreground tabular-nums">
                  {bytes(item.file.size)}{item.info ? ` · ${time(item.info.duration)} · ${item.info.width} × ${item.info.height}` : ""} · {statusText(item)}
                </span>
              </span>
            </>
          );
          return (
            <li key={item.id} className={cn("px-4 py-2.5 sm:px-5", selectable && item.id === selectedId && "bg-primary-soft")}>
              <div className="flex items-center gap-3">
                {selectable ? (
                  <button type="button" aria-pressed={item.id === selectedId} onClick={() => onSelect!(item.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">{content}</button>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
                )}
                <button type="button" className={buttonClass("ghost", "sm", "w-8 px-0")} aria-label={`Remove ${item.file.name}`} disabled={busy} onClick={() => onRemove(item.id)}><X className="h-4 w-4" aria-hidden /></button>
              </div>
              {item.status === "processing" && (
                <div className="ml-12 mt-2 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${item.file.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress == null ? undefined : Math.round(item.progress * 100)}>
                  <div className={cn("h-full rounded-full bg-primary transition-[width]", item.progress == null && "w-1/3 animate-pulse")} style={item.progress == null ? undefined : { width: `${Math.max(2, Math.min(100, item.progress * 100))}%` }} />
                </div>
              )}
              {item.error && <p className="ml-12 mt-1.5 text-[13px] leading-relaxed text-danger">{item.error}</p>}
            </li>
          );
        })}
      </ul>
      {children}
    </section>
  );
}

function PrimaryBar({ busy, active, message, label, disabled, onRun, onCancel, progressLabel }: {
  busy: boolean;
  active?: QueueItem;
  message: string;
  label: string;
  disabled: boolean;
  onRun: () => void;
  onCancel: () => void;
  progressLabel?: string;
}) {
  if (busy) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 sm:px-5">
        <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-accent-text" aria-hidden />
        <div className="min-w-0 flex-1" role="status" aria-live="polite">
          <p className="text-sm font-medium">{progressLabel || "Working…"}</p>
          <p className="truncate text-[13px] text-muted-foreground">{active?.phase || message || "Loading the video engine…"} · Keep this tab open.</p>
        </div>
        <button type="button" className={buttonClass("secondary", "md")} onClick={onCancel}><X className="h-4 w-4" aria-hidden />Cancel</button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={buttonClass("primary", "lg", "min-w-[200px]")} disabled={disabled} onClick={onRun}>{label}</button>
      <span className="hidden text-xs text-muted-foreground sm:inline">⌘ / Ctrl + Enter</span>
    </div>
  );
}

/** Pick the start and end of the clip for a GIF, up to LIMITS.gifSeconds. */
function ClipRange({ item, settings, setStart, setEnd, disabled }: { item: QueueItem; settings: VideoSettings; setStart: (value: number) => void; setEnd: (value: number) => void; disabled: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState("");
  useEffect(() => { const next = URL.createObjectURL(item.file); setUrl(next); return () => URL.revokeObjectURL(next); }, [item.file]);
  const duration = item.info?.duration ?? 0;
  const end = Math.min(settings.trimEnd || duration, duration);
  const start = Math.min(settings.trimStart, Math.max(0, end - 0.1));
  const length = Math.max(0, end - start) / settings.speed;
  const tooLong = length > LIMITS.gifSeconds;
  const now = () => video.current?.currentTime ?? 0;

  return (
    <section aria-label="Choose the clip" className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <video ref={video} src={url || undefined} controls muted playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black object-contain" />
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium">Choose the part to loop</h2>
          <p className={cn("mt-1 text-[13px] tabular-nums", tooLong ? "text-danger" : "text-muted-foreground")}>
            {length.toFixed(1)} s selected · {LIMITS.gifSeconds} s max
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Start" value={start} min={0} max={Math.max(0, end - 0.1)} step={0.1} suffix="sec" disabled={disabled} onChange={setStart} />
          <NumberField label="End" value={end} min={start + 0.1} max={duration} step={0.1} suffix="sec" disabled={disabled} onChange={setEnd} />
          <button type="button" className={buttonClass("secondary", "sm")} disabled={disabled} onClick={() => setStart(Math.min(now(), end - 0.1))}>Start here</button>
          <button type="button" className={buttonClass("secondary", "sm")} disabled={disabled} onClick={() => setEnd(Math.max(now(), start + 0.1))}>End here</button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">Play or scrub the video, then use Start here and End here. Shorter clips and smaller widths make smaller GIFs.</p>
      </div>
    </section>
  );
}
