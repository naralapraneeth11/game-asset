"use client";

import { useEffect, useId, useState } from "react";
import { ArrowDownToLine, Check, ImageIcon, Loader2, Package, Plus, RotateCcw, Scan, Square, Trash2, X } from "lucide-react";
import { DropZone } from "@/components/tool/DropZone";
import { buttonClass } from "@/components/tool/buttons";
import { LIMITS, readableBytes, signature, type QueueItem, type ScalerMode } from "./types";
import { usePixelScaler } from "./usePixelScaler";
import s from "./PixelArtScaler.module.css";

function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => { if (!blob) { setUrl(undefined); return; } const next = URL.createObjectURL(blob); setUrl(next); return () => URL.revokeObjectURL(next); }, [blob]);
  return url;
}

function Preview({ item, nearest }: { item: QueueItem; nearest: boolean }) {
  const [choice, setChoice] = useState(-1);
  const [zoom, setZoom] = useState(0);
  const [imageError, setImageError] = useState(false);
  const output = choice >= 0 ? item.result?.outputs[choice] : undefined;
  // Do not decode an uninspected original in the main-thread preview. A source
  // preview becomes available after the worker has checked dimensions safely.
  const blob = output?.blob ?? (item.result ? item.file : undefined);
  const url = useBlobUrl(blob);
  const width = output?.width ?? item.result?.source.width;
  const height = output?.height ?? item.result?.source.height;
  useEffect(() => { setImageError(false); }, [blob]);
  useEffect(() => { if (item.result) setChoice(0); }, [item.result]);
  return <section className={s.preview} aria-label="Image preview">
    <div className={s.previewBar}>
      <div className={s.segment} role="group" aria-label="Preview file">
        <button type="button" aria-pressed={choice === -1} onClick={() => setChoice(-1)}>Source</button>
        {item.result?.outputs.map((file, index) => <button type="button" key={file.name} aria-pressed={choice === index} onClick={() => setChoice(index)}>{file.density ? `@${file.density}x` : `${file.factor}× result`}</button>)}
      </div>
      <label className={s.zoom}>Zoom <select aria-label="Preview zoom" value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value={0}>Fit</option><option value={1}>100%</option><option value={2}>200%</option><option value={4}>400%</option><option value={8}>800%</option></select></label>
    </div>
    <div className={`${s.checkerboard} ${zoom ? s.actualSize : ""}`} tabIndex={0} aria-label="Scrollable image preview. Checkerboard indicates transparency.">
      {imageError ? <p className={s.previewEmpty}>Your browser cannot preview this file. Processing will report any format issue.</p> : url ? <img src={url} alt={`${output ? "Exported" : "Source"} ${item.file.name}`} onError={() => setImageError(true)} className={nearest ? s.crisp : undefined} style={zoom && width ? { width: width * zoom, height: height ? height * zoom : undefined, maxWidth: "none", maxHeight: "none" } : undefined} /> : blob ? <Loader2 size={20} className={s.spin} aria-label="Loading preview" /> : <p className={s.previewEmpty}>Process this image to load a preview after its dimensions have been checked.</p>}
    </div>
    <div className={s.previewFooter}><span>{width && height ? `${width.toLocaleString()} × ${height.toLocaleString()} px` : "Source preview"}</span><span>{readableBytes(blob?.size ?? item.file.size)} · {output ? "PNG" : "Source"}</span></div>
  </section>;
}

/** Client workspace only. The surrounding ToolPage supplies SEO, title and navigation. */
export default function PixelArtScaler({ mode = "pixel" }: { mode?: ScalerMode }) {
  const app = usePixelScaler(mode);
  const titleId = useId();
  const selected = app.items.find(item => item.id === app.selectedId) ?? app.items[0];
  const done = app.items.filter(item => item.result);
  const outputs = done.reduce((sum, item) => sum + (item.result?.outputs.length ?? 0), 0);
  const bytes = done.reduce((sum, item) => sum + (item.result?.outputs.reduce((total, file) => total + file.blob.size, 0) ?? 0), 0);
  const stale = selected?.result && signature(selected.result.settings) !== signature(app.settings);
  const pending = app.items.filter(item => !item.result || signature(item.result.settings) !== signature(app.settings)).length;
  const sourcePixels = selected?.result?.source;
  const target = sourcePixels ? mode === "pixel" ? `${sourcePixels.width * app.settings.factor} × ${sourcePixels.height * app.settings.factor} px` : `${sourcePixels.width / app.settings.inputDensity} × ${sourcePixels.height / app.settings.inputDensity} logical px` : "Dimensions appear after processing";

  return <div className={s.root} onPaste={event => { if (event.clipboardData.files.length) { event.preventDefault(); app.addFiles(Array.from(event.clipboardData.files)); } }} onKeyDown={event => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void app.run(); }
    if (event.key === "Escape" && app.busy) { event.preventDefault(); app.cancel(); }
  }}>
    <DropZone accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" title={mode === "pixel" ? "Drop your pixel art" : "Drop images to create a density set"} hint={app.items.length ? `${app.items.length}/${LIMITS.files} files added · duplicates are skipped` : "Static PNG, JPEG or WebP · up to 32 MB per file · transparent PNG output"} icon={<Scan size={25} aria-hidden />} compact={app.items.length > 0} disabled={app.busy} onFiles={app.addFiles} footer="Files stay in your browser. No sign-in, uploads or watermarks." />

    {(app.message || app.error) && <div className={s.notices}><p role="status" aria-live="polite">{app.message}</p>{app.error && <p role="alert" className={s.error}>{app.error}</p>}</div>}

    {app.items.length > 0 && <section className={s.queue} aria-label="Added images">
      <div className={s.queueHeading}><h2>{app.items.length} image{app.items.length === 1 ? "" : "s"} added</h2><button type="button" className={buttonClass("ghost", "sm")} disabled={app.busy} onClick={app.clear}><Trash2 size={14} aria-hidden />Clear all</button></div>
      <div className={s.queueItems}>{app.items.map(item => <div key={item.id} className={s.queueRow} data-selected={selected?.id === item.id || undefined}>
        <button type="button" className={s.selectFile} aria-pressed={selected?.id === item.id} onClick={() => app.select(item.id)}>
          <span className={s.fileIcon}>{item.status === "working" ? <Loader2 size={19} className={s.spin} aria-hidden /> : item.status === "done" ? <Check size={19} aria-hidden /> : <ImageIcon size={19} aria-hidden />}</span>
          <span className={s.fileCopy}><span className={s.fileName}>{item.file.name}</span><span>{readableBytes(item.file.size)} · {item.result && signature(item.result.settings) !== signature(app.settings) ? "Settings changed" : item.phase}{item.status === "working" ? ` · ${Math.round(item.progress * 100)}%` : ""}</span></span>
        </button>
        <button type="button" className={s.remove} aria-label={`Remove ${item.file.name}`} disabled={app.busy} onClick={() => app.remove(item.id)}><X size={16} aria-hidden /></button>
        {item.status === "working" && <progress className={s.rowProgress} aria-label={`Progress for ${item.file.name}`} value={item.progress} max={1} />}
      </div>)}</div>
    </section>}

    <div className={s.workspace}>
      <section className={s.controls} aria-labelledby={titleId}>
        <div className={s.panelHeading}><span className="eyebrow">{mode === "pixel" ? "Pixel art" : "Density set"}</span><h2 id={titleId}>{mode === "pixel" ? "Keep every edge sharp" : "One source. Three sizes."}</h2><p>{mode === "pixel" ? "Whole-number scaling repeats pixels cleanly, without smoothing." : "Generate correctly sized @1x, @2x and @3x PNGs together."}</p></div>
        <fieldset disabled={app.busy} className={s.fields}>
          {mode === "pixel" ? <>
            <div className={s.labelRow}><label htmlFor={`${titleId}-factor`}>Scale factor</label><span>{app.settings.factor}×</span></div>
            <div className={s.presets} role="group" aria-label="Popular scale factors">{[2, 3, 4, 8, 16].map(factor => <button key={factor} type="button" aria-pressed={app.settings.factor === factor} onClick={() => app.setSettings(current => ({ ...current, factor }))}>{factor}×</button>)}</div>
            <select id={`${titleId}-factor`} value={app.settings.factor} onChange={event => app.setSettings(current => ({ ...current, factor: Number(event.target.value) }))}>{Array.from({ length: 16 }, (_, index) => index + 1).map(factor => <option value={factor} key={factor}>{factor}×{factor === 1 ? " — original size" : ""}</option>)}</select>
            <div className={s.settingNote}><Scan size={16} aria-hidden /><div><strong>Nearest-neighbor scaling</strong><span>No interpolation. Original transparency stays transparent.</span></div></div>
          </> : <>
            <label htmlFor={`${titleId}-density`}>Source density</label>
            <select id={`${titleId}-density`} value={app.settings.inputDensity} onChange={event => app.setSettings(current => ({ ...current, inputDensity: Number(event.target.value) as 1 | 2 | 3 }))}><option value={1}>@1x — source is the base size</option><option value={2}>@2x — source is double size</option><option value={3}>@3x — source is triple size</option></select>
            <p className={s.help}>Example: a 96 × 96 source at @3x creates 32 × 32, 64 × 64 and 96 × 96 PNGs. Both dimensions must divide evenly by the source density.</p>
            <label htmlFor={`${titleId}-sampling`}>Resize method</label>
            <select id={`${titleId}-sampling`} value={app.settings.sampling} onChange={event => app.setSettings(current => ({ ...current, sampling: event.target.value as "nearest" | "smooth" }))}><option value="nearest">Nearest neighbor — pixel art</option><option value="smooth">High-quality smoothing — illustrations</option></select>
            <p className={s.help}>Smoothing is useful for continuous artwork. Nearest neighbor keeps hard pixel edges.</p>
          </>}
          <div className={s.outputInfo}><span>Output</span><strong>{mode === "pixel" ? `${app.settings.factor}× PNG` : "@1x + @2x + @3x PNG"}</strong><small>{target}</small></div>
        </fieldset>
        <div className={s.runActions}>
          {app.busy ? <button type="button" className={buttonClass("secondary", "lg")} onClick={app.cancel}><Square size={16} aria-hidden />Cancel processing</button> : <button type="button" className={buttonClass("primary", "lg")} disabled={!app.items.length || !pending} onClick={() => void app.run()}><Plus size={17} aria-hidden />{mode === "pixel" ? "Scale" : "Generate"}{pending > 1 ? ` ${pending} images` : " PNGs"}</button>}
          <span className={s.shortcut}>⌘ / Ctrl + Enter to process · Esc to cancel</span>
        </div>
      </section>

      <div className={s.previewColumn}>
        {selected ? <Preview key={selected.id} item={selected} nearest={mode === "pixel" || app.settings.sampling === "nearest"} /> : <div className={s.empty}><div className={s.pixelMark} aria-hidden><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><h2>Your artwork, pixel for pixel</h2><p>Add images above to see a checkerboard preview and inspect your output at up to 800% zoom.</p></div>}
        {selected?.error && <div className={s.errorPanel} role="alert"><strong>{selected.file.name}</strong><p>{selected.error}</p><button type="button" className={buttonClass("secondary", "sm")} disabled={app.busy} onClick={() => void app.run(selected.id)}><RotateCcw size={14} aria-hidden />Retry this image</button></div>}
        {stale && <p className={s.stale} role="status">Settings changed. The preview and downloads show the previous export until you process again.</p>}
        {selected?.result && <section className={s.results} aria-label="PNG downloads"><div className={s.resultsHeading}><h2>Ready to use</h2><span>Lossless PNG</span></div>{selected.result.outputs.map((file, index) => <div className={s.resultRow} key={file.name}><div><strong>{file.name}</strong><span>{file.width.toLocaleString()} × {file.height.toLocaleString()} px · {readableBytes(file.blob.size)}</span></div><button type="button" className={buttonClass("secondary", "sm")} aria-label={`Download ${file.name}`} onClick={() => app.save(selected.id, index)}><ArrowDownToLine size={15} aria-hidden />PNG</button></div>)}</section>}
      </div>
    </div>

    {outputs > 0 && <div className={s.downloadBar}><div><strong>{outputs} PNG{outputs === 1 ? "" : "s"} ready</strong><span>{readableBytes(bytes)} · ZIP includes dimensions and settings manifest</span></div><button type="button" className={buttonClass("primary", "md")} disabled={app.busy} onClick={() => void app.saveAll()}><Package size={17} aria-hidden />Download all as ZIP</button></div>}
    <details className={s.limits}><summary>File limits and image handling</summary><p>Up to 24 files, 32 MB each. Source and output images are limited to 16 megapixels and 8,192 pixels on either side; a working-memory check can require smaller images. Completed outputs and ZIPs are limited to 96 MB per batch. Download and remove completed images to free space.</p><p>Static PNG, JPEG and WebP are supported. Animated files are rejected instead of silently flattening them. All exports are PNG; transparency is preserved, and source metadata is not copied. Browser decoding can normalize image color profiles. Density names describe actual pixel sizes, not DPI metadata.</p></details>
  </div>;
}
