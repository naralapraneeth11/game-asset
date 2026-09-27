"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowDownToLine, Check, FileImage, FolderOpen, ImageDown, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { AVIF_PRESET_QUALITY, DEFAULTS, PRESET_QUALITY, bytes, savings } from "./engine/core";
import type { OutputFormat, Preset, Settings } from "./engine/core";
import { useCompressor, type InputFile, type Item } from "./useCompressor";
import { droppedFiles, sampleImage } from "./input";
import { downloadItem, downloadZip, outputFormat } from "./export";
import Toggle from "@/components/ui/Toggle";
import { DropZone } from "@/components/tool/DropZone";
import { PresetPicker } from "@/components/tool/PresetPicker";
import { AdvancedPanel } from "@/components/tool/AdvancedPanel";
import { buttonClass } from "@/components/tool/buttons";
import { cn } from "@/lib/utils";
import Compare from "./Compare";
import Offline from "./Offline";
import styles from "./ImageCompressor.module.css";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif";
const presets = [
  { value: "smaller", label: "Smaller file", hint: "Strongest compression" },
  { value: "balanced", label: "Balanced", hint: "Recommended for most images" },
  { value: "quality", label: "Higher quality", hint: "Closest to the original" },
] as const;
const formatNames: Record<OutputFormat, string> = { original: "Keep original format", webp: "WebP", jpeg: "JPEG", avif: "AVIF", png: "PNG · lossless", jxl: "JPEG XL · experimental" };
const formatHints: Record<OutputFormat, string> = {
  original: "Each image keeps its format. PNGs are optimized losslessly, so sprites stay pixel-perfect.",
  webp: "Small files with transparency; supported by every current browser.",
  jpeg: "Plays everywhere. Transparent areas get a background color.",
  avif: "Smallest files, slower to encode. Check your engine supports it.",
  png: "Lossless: every pixel stays the same. Savings vary.",
  jxl: "Experimental. Check the app that receives the file supports it.",
};
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const sameSettings = (item: Item, settings: Settings) => JSON.stringify(item.settings) === JSON.stringify(settings);

export default function ImageCompressor() {
  const { items, settings, setSettings, notice, setNotice, maxPixels, add, start, cancel, remove, clear, busy } = useCompressor();
  const folder = useRef<HTMLInputElement>(null), zipAbort = useRef<AbortController | null>(null), alive = useRef(true), preview = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null), [importing, setImporting] = useState(false), [archive, setArchive] = useState<number | null>(null), [experimental, setExperimental] = useState(false);

  const done = items.filter(x => x.result), selectedItem = done.find(x => x.id === selected) || done[0];
  const before = done.reduce((n, x) => n + x.file.size, 0), after = done.reduce((n, x) => n + x.result!.blob.size, 0), percent = savings(before, after);
  const todo = items.filter(x => ["ready", "error", "cancelled"].includes(x.state) || (x.result && !sameSettings(x, settings)));
  const working = items.filter(x => x.state === "working" || x.state === "queued");
  const lossless = settings.format === "png";
  const family = settings.format === "avif" ? AVIF_PRESET_QUALITY : PRESET_QUALITY;
  const preset = (Object.keys(family) as Preset[]).find(key => family[key] === settings.quality) ?? null;
  const summary = [formatNames[settings.format], lossless ? "" : settings.targetKB ? `target ${settings.targetKB} KB` : `quality ${settings.quality}`, settings.maxWidth || settings.maxHeight ? `max ${settings.maxWidth || "∞"} × ${settings.maxHeight || "∞"}` : "", settings.autoResize ? "" : "no auto-resize"].filter(Boolean).join(" · ");

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings(previous => ({ ...previous, [key]: value, ...(["maxWidth", "maxHeight"].includes(key) || (key === "autoResize" && value) ? { preservePngMetadata: false } : {}), ...(key === "preservePngMetadata" && value ? { autoResize: false } : {}) }));
  const changeFormat = (format: OutputFormat) => setSettings(s => {
    const from = s.format === "avif" ? AVIF_PRESET_QUALITY : PRESET_QUALITY, to = format === "avif" ? AVIF_PRESET_QUALITY : PRESET_QUALITY;
    const current = (Object.keys(from) as Preset[]).find(key => from[key] === s.quality) ?? "balanced";
    return { ...s, format, quality: to[current], targetKB: format === "png" ? 0 : s.targetKB, preservePngMetadata: format === "png" || format === "original" ? s.preservePngMetadata : false };
  });
  // Compression is cheap enough to start as soon as files arrive.
  const addAndStart = (files: InputFile[]) => { const result = add(files); if (result.ids.length) start(result.ids); };
  const showPreview = (id: string) => { setSelected(id); requestAnimationFrame(() => preview.current?.scrollIntoView({ block: "start", behavior: "smooth" })); };

  const addAndStartRef = useRef(addAndStart);
  addAndStartRef.current = addAndStart;
  useEffect(() => {
    alive.current = true;
    folder.current?.setAttribute("webkitdirectory", "");
    const paste = (event: ClipboardEvent) => {
      if ((event.target as Element)?.closest("input, textarea, [contenteditable=true]")) return;
      const images = Array.from(event.clipboardData?.files || []).filter(file => file.type.startsWith("image/"));
      if (images.length) { event.preventDefault(); addAndStartRef.current(images.map(file => ({ file, path: file.name }))); }
    };
    window.addEventListener("paste", paste);
    return () => { alive.current = false; window.removeEventListener("paste", paste); zipAbort.current?.abort(); };
  }, []);

  async function fromTransfer(transfer: DataTransfer) {
    setImporting(true);
    try { const files = await droppedFiles(transfer); if (alive.current) addAndStart(files); }
    catch (error) { if (alive.current) setNotice((error as Error).message); }
    finally { if (alive.current) setImporting(false); }
  }
  async function sample() {
    setImporting(true);
    try { const file = await sampleImage(); if (alive.current) addAndStart([{ file, path: file.name }]); }
    catch (e) { if (alive.current) setNotice((e as Error).message); }
    finally { if (alive.current) setImporting(false); }
  }
  async function downloadAll() {
    if (done.length === 1) { downloadItem(done[0]); return; }
    const controller = new AbortController(); zipAbort.current = controller; setArchive(0);
    try { await downloadZip(items, n => { if (alive.current) setArchive(n); }, controller.signal); }
    catch (e) { if (alive.current) setNotice((e as Error).message); }
    finally { if (alive.current) setArchive(null); zipAbort.current = null; }
  }

  // One primary button per state.
  const primary = busy
    ? <button type="button" className={buttonClass("secondary", "lg")} onClick={() => cancel()}><X className="h-4 w-4" aria-hidden />Cancel</button>
    : todo.length
      ? <button type="button" className={buttonClass("primary", "lg")} disabled={archive !== null || importing} onClick={() => start(todo.map(x => x.id))}><ImageDown className="h-4 w-4" aria-hidden />Compress {plural(todo.length, "image")}</button>
      : done.length
        ? <button type="button" className={buttonClass("primary", "lg")} onClick={() => archive !== null ? zipAbort.current?.abort() : void downloadAll()}>{archive !== null ? <><X className="h-4 w-4" aria-hidden />Cancel ZIP · {archive} of {done.length}</> : <><ArrowDownToLine className="h-4 w-4" aria-hidden />{done.length === 1 ? "Download" : "Download all (ZIP)"}</>}</button>
        : null;

  return <div className={styles.tool} aria-busy={importing}>
    <input ref={folder} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={e => { if (e.target.files) addAndStart(Array.from(e.target.files).map(file => ({ file, path: file.webkitRelativePath || file.name }))); e.target.value = ""; }} />

    <DropZone
      accept={ACCEPT}
      disabled={importing}
      compact={items.length > 0}
      onFiles={files => addAndStart(files.map(file => ({ file, path: file.name })))}
      onDropTransfer={fromTransfer}
      title={importing ? "Adding your images…" : "Drop images to compress"}
      hint={items.length ? "Drop more images or folders, or paste from the clipboard" : `JPEG, PNG, WebP or AVIF. Folders and paste work too. Up to 100 images, 20 MB each, ${Math.round(maxPixels / 1e6)} MP.`}
      icon={importing ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <ImageDown className="h-6 w-6" strokeWidth={1.6} aria-hidden />}
      buttonLabel="Choose images"
      actions={<button type="button" className={buttonClass("secondary", items.length ? "sm" : "lg")} onClick={() => folder.current?.click()} disabled={importing}><FolderOpen className="h-4 w-4" aria-hidden />Choose folder</button>}
      footer={<button type="button" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={sample} disabled={importing}>Try a sample image</button>}
    />

    <div className="space-y-3">
      <PresetPicker label="Compression level" options={presets} value={lossless ? null : preset} disabled={lossless} onChange={value => { if (value) setSettings(s => ({ ...s, quality: (s.format === "avif" ? AVIF_PRESET_QUALITY : PRESET_QUALITY)[value], targetKB: 0 })); }} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium">Output
          <select className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm" value={settings.format} onChange={e => changeFormat(e.target.value as OutputFormat)} disabled={busy}>
            {(["original", "webp", "jpeg", "avif", "png", ...(experimental ? ["jxl" as const] : [])] as OutputFormat[]).map(format => <option key={format} value={format}>{formatNames[format]}</option>)}
          </select>
        </label>
        <p className="text-[13px] text-muted-foreground">{formatHints[settings.format]}</p>
      </div>
    </div>

    {notice && <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted px-4 py-2.5 text-[13px]" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" className="-m-1 rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => setNotice("")}><X className="h-3.5 w-3.5" aria-hidden /></button></div>}

    {items.length > 0 && <section className="overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="compressor-queue">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 id="compressor-queue" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{done.length ? `${done.length} of ${plural(items.length, "image")} done` : plural(items.length, "image")}</h2>
          {done.length ? <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xl font-semibold tabular-nums tracking-tight">
            <span className="text-muted-foreground line-through decoration-1">{bytes(before)}</span><span aria-hidden>→</span><span className="sr-only">to</span><span>{bytes(after)}</span>
            <span className={cn("text-base", percent >= 0.5 ? "text-[var(--success)]" : "text-[var(--warning)]")}>{percent >= 0 ? `${percent.toFixed(0)}% smaller` : `${Math.abs(percent).toFixed(0)}% larger`}</span>
          </p> : <p className="mt-1 text-sm text-muted-foreground">{busy ? "Compressing on your device…" : "Ready to compress"}</p>}
          {busy && <p className="mt-1 text-[13px] text-muted-foreground" aria-live="polite">{plural(working.length, "image")} left…</p>}
        </div>
        {primary}
      </div>
      <ul className="max-h-[440px] divide-y divide-border overflow-auto">{items.map(item => {
        const stale = item.result && !sameSettings(item, settings);
        return <li key={item.id} className={cn("flex items-center gap-3 px-5 py-3", selectedItem?.id === item.id && done.length > 1 && "bg-hover")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{item.state === "working" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : item.state === "done" ? <Check className="h-4 w-4 text-[var(--success)]" aria-hidden /> : item.state === "error" ? <AlertCircle className="h-4 w-4 text-[var(--danger)]" aria-hidden /> : <FileImage className="h-4 w-4" aria-hidden />}</span>
          <div className="min-w-0 flex-1">
            <button type="button" className="block max-w-full truncate text-left text-sm font-medium enabled:hover:underline enabled:hover:underline-offset-4 disabled:cursor-default" disabled={!item.result} onClick={() => showPreview(item.id)} title={item.path}>{item.path}</button>
            <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">{bytes(item.file.size)}{item.result ? <> → {bytes(item.result.blob.size)} · {outputFormat(item).toUpperCase()} · {item.result.width} × {item.result.height}{(item.result.inputWidth !== item.result.width || item.result.inputHeight !== item.result.height) && ` (from ${item.result.inputWidth} × ${item.result.inputHeight})`}</> : ` · ${item.phase || (item.state === "ready" ? "Ready" : item.state === "queued" ? "Waiting" : item.state === "cancelled" ? "Cancelled" : item.state === "error" ? "Needs attention" : "Working")}`}</p>
            {item.error && <p className="mt-1 text-[13px] leading-relaxed text-[var(--danger)]" role="alert">{item.error}</p>}
            {stale && <p className="mt-0.5 text-xs text-muted-foreground">Made with earlier settings. Compress again to apply the new ones.</p>}
            {item.result && !item.result.targetMet && <p className="mt-0.5 text-xs text-[var(--warning)]">Target size not reached; kept the smallest result.</p>}
          </div>
          <div className="flex items-center gap-1">
            {item.result && <button className={buttonClass("ghost", "sm", "hidden sm:inline-flex")} type="button" onClick={() => showPreview(item.id)}>Compare</button>}
            {item.result && <button type="button" className={buttonClass("ghost", "sm", "w-8 px-0")} aria-label={`Download ${item.file.name}`} onClick={() => downloadItem(item)}><ArrowDownToLine className="h-4 w-4" aria-hidden /></button>}
            {["error", "cancelled"].includes(item.state) && <button type="button" className={buttonClass("ghost", "sm", "w-8 px-0")} aria-label={`Retry ${item.file.name}`} onClick={() => start([item.id])}><RotateCcw className="h-4 w-4" aria-hidden /></button>}
            <button type="button" className={buttonClass("ghost", "sm", "w-8 px-0")} aria-label={`Remove ${item.file.name}`} disabled={archive !== null} onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" aria-hidden /></button>
          </div>
        </li>;
      })}</ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
        <span>{done.length > 1 ? "The ZIP keeps your folders and adds a JSON report." : "Originals are never changed."}</span>
        <button type="button" className={buttonClass("ghost", "sm")} onClick={clear} disabled={archive !== null}>Clear all</button>
      </div>
    </section>}

    {selectedItem && <div ref={preview} className={styles.previewAnchor}><Compare key={selectedItem.id} item={selectedItem} /></div>}

    <AdvancedPanel summary={summary}>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <legend className="sr-only">Advanced settings</legend>
        {lossless ? <p className="text-[13px] text-muted-foreground">Original-size PNGs use OxiPNG and keep every pixel. Resized or converted images are normalized to 8-bit sRGB first.</p> : <label className={styles.rangeLabel}><span>Quality <output>{settings.quality}</output></span><input type="range" min="1" max="100" value={settings.quality} onChange={e => update("quality", +e.target.value)} disabled={settings.targetKB > 0} /><span className={styles.rangeEnds}><span>Smaller file</span><span>More detail</span></span></label>}
        <div className={styles.fieldGrid}>
          <label className={styles.field}>Target size (KB)<input type="number" min="0" max="20000" step="1" value={settings.targetKB || ""} placeholder="Optional" disabled={lossless} onChange={e => update("targetKB", e.target.value ? Number(e.target.value) : 0)} /><small>Up to 8 attempts to fit. Lossy formats only; PNGs keep all pixels.</small></label>
          <label className={styles.field}>Minimum search quality<input type="number" min="1" max="100" step="1" value={settings.minQuality} disabled={!settings.targetKB} onChange={e => update("minQuality", Number(e.target.value))} /><small>The target search won&apos;t go below this.</small></label>
          <label className={styles.field}>Maximum width (px)<input type="number" min="0" max="8000" step="1" value={settings.maxWidth || ""} placeholder="Original width" onChange={e => update("maxWidth", e.target.value ? Number(e.target.value) : 0)} /></label>
          <label className={styles.field}>Maximum height (px)<input type="number" min="0" max="8000" step="1" value={settings.maxHeight || ""} placeholder="Original height" onChange={e => update("maxHeight", e.target.value ? Number(e.target.value) : 0)} /></label>
          <label className={styles.field}>Encoding effort<select value={settings.effort} disabled={settings.format === "jpeg" || settings.format === "jxl"} onChange={e => update("effort", e.target.value as Settings["effort"])}><option value="fast">Fast</option><option value="balanced">Balanced</option><option value="thorough">Thorough · slower</option></select><small>JPEG uses optimized defaults; JPEG XL uses effort 7.</small></label>
          <label className={styles.field}>JPEG background<div className={styles.colorField}><input type="color" aria-label="JPEG background color" value={settings.matte} disabled={settings.format !== "jpeg" && settings.format !== "original"} onChange={e => update("matte", e.target.value)} /><span>{settings.matte.toUpperCase()}</span></div><small>Fills transparent areas in JPEG output. Other formats keep transparency.</small></label>
        </div>
        <p className={styles.hint}>Resizing keeps the aspect ratio and never enlarges an image.</p>
        <div className={styles.toggleRow}><div><label id="compressor-fit-label" htmlFor="compressor-fit">Fit large images safely</label><p id="compressor-fit-description">Very large images may be scaled down to fit this device&apos;s memory budget; output sizes are shown on each row. Turn off for normal maps, masks and pixel art, so oversized images are rejected instead of resized.</p></div><Toggle id="compressor-fit" aria-labelledby="compressor-fit-label" aria-describedby="compressor-fit-description" checked={settings.autoResize} disabled={busy} onChange={value => update("autoResize", value)} /></div>
        <div className={styles.toggleRow}><div><label id="compressor-metadata-label" htmlFor="compressor-metadata">Preserve original PNG metadata</label><p id="compressor-metadata-description">Only for PNGs kept at their original size. Metadata can contain private information.</p></div><Toggle id="compressor-metadata" aria-labelledby="compressor-metadata-label" aria-describedby="compressor-metadata-description" checked={settings.preservePngMetadata} disabled={busy || (settings.format !== "png" && settings.format !== "original") || !!settings.maxWidth || !!settings.maxHeight} onChange={value => update("preservePngMetadata", value)} /></div>
        <div className={styles.toggleRow}><div><label id="compressor-jxl-label" htmlFor="compressor-jxl">Show experimental JPEG XL</label><p id="compressor-jxl-description">Check that the app or engine receiving the file supports it.</p></div><Toggle id="compressor-jxl" aria-labelledby="compressor-jxl-label" aria-describedby="compressor-jxl-description" checked={experimental} disabled={busy} onChange={value => { setExperimental(value); if (!value && settings.format === "jxl") changeFormat("original"); }} /></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Offline onNotice={setNotice} />
          <button className={buttonClass("ghost", "sm")} type="button" disabled={busy} onClick={() => { setSettings({ ...DEFAULTS }); setExperimental(false); }}><RotateCcw className="h-3.5 w-3.5" aria-hidden />Reset settings</button>
        </div>
      </fieldset>
    </AdvancedPanel>

    <p className={styles.footnote}>Still images only. For normal maps, masks and pixel-critical sprites, keep PNG output and turn off “Fit large images safely”. Check modern formats against your game&apos;s runtime support.</p>
  </div>;
}
