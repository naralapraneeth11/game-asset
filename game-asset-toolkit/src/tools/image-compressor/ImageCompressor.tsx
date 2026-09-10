"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, FileImage, FolderOpen, ImageDown, Loader2, RotateCcw, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { DEFAULTS, bytes, savings } from "./engine/core";
import type { Format, Settings } from "./engine/core";
import { useCompressor } from "./useCompressor";
import { droppedFiles, sampleImage } from "./input";
import { downloadItem, downloadZip } from "./export";
import Compare from "./Compare";
import Offline from "./Offline";
import styles from "./ImageCompressor.module.css";

export default function ImageCompressor() {
  const { items, settings, setSettings, notice, setNotice, maxPixels, add, start, cancel, remove, clear, busy } = useCompressor();
  const input = useRef<HTMLInputElement>(null), folder = useRef<HTMLInputElement>(null), zipAbort = useRef<AbortController | null>(null);
  const [selected, setSelected] = useState<string | null>(null), [dragging, setDragging] = useState(false), [importing, setImporting] = useState(false), [archive, setArchive] = useState<number | null>(null), [experimental, setExperimental] = useState(false);
  const depth = useRef(0), alive = useRef(true);
  const done = items.filter(x => x.result), selectedItem = done.find(x => x.id === selected) || done[0];
  const before = done.reduce((n, x) => n + x.file.size, 0), after = done.reduce((n, x) => n + x.result!.blob.size, 0), percent = savings(before, after);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings(previous => ({ ...previous, [key]: value }));
  const chooseFiles = (files: FileList | null) => { if (files) add(Array.from(files).slice(0, 100).map(file => ({ file, path: file.webkitRelativePath || file.name }))); };
  useEffect(() => {
    alive.current = true;
    folder.current?.setAttribute("webkitdirectory", "");
    const paste = (event: ClipboardEvent) => {
      if ((event.target as Element)?.closest("input, textarea, [contenteditable=true]")) return;
      const images = Array.from(event.clipboardData?.files || []).filter(file => file.type.startsWith("image/"));
      if (images.length) { event.preventDefault(); add(images.map(file => ({ file, path: file.name }))); }
    };
    window.addEventListener("paste", paste);
    return () => { alive.current = false; window.removeEventListener("paste", paste); zipAbort.current?.abort(); };
  }, [add]);
  async function sample() { setImporting(true); try { const file = await sampleImage(); if (alive.current) add([{ file, path: file.name }]); } catch (e) { if (alive.current) setNotice((e as Error).message); } finally { if (alive.current) setImporting(false); } }
  async function archiveResults() {
    const controller = new AbortController(); zipAbort.current = controller; setArchive(0);
    try { await downloadZip(items, n => { if (alive.current) setArchive(n); }, controller.signal); if (alive.current) setNotice("ZIP downloaded with folder paths and a compression report."); }
    catch (e) { if (alive.current) setNotice((e as Error).message); }
    finally { if (alive.current) setArchive(null); zipAbort.current = null; }
  }
  const changeFormat = (format: Format) => setSettings(s => ({ ...s, format, quality: format === "avif" ? 60 : 80, targetKB: format === "png" ? 0 : s.targetKB, preservePngMetadata: false }));
  return <div className={styles.tool} aria-busy={importing}>
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif" className={styles.hidden} onChange={e => { chooseFiles(e.target.files); e.target.value = ""; }} aria-label="Choose images" />
    <input ref={folder} type="file" multiple className={styles.hidden} onChange={e => { chooseFiles(e.target.files); e.target.value = ""; }} aria-label="Choose an image folder" />
    <section className={`${styles.drop} ${dragging ? styles.dragging : ""}`} aria-label="Add images"
      onDragEnter={e => { e.preventDefault(); depth.current++; setDragging(true); }} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={e => { e.preventDefault(); if (--depth.current <= 0) setDragging(false); }}
      onDrop={async e => { e.preventDefault(); depth.current = 0; setDragging(false); setImporting(true); try { const files = await droppedFiles(e.dataTransfer); if (alive.current) { add(files); if (files.length >= 100) setNotice("Added up to 100 files. Larger folders should be processed in separate batches."); } } catch (error) { if (alive.current) setNotice((error as Error).message); } finally { if (alive.current) setImporting(false); } }}>
      <div className={styles.dropIcon}><Upload size={22} strokeWidth={1.6} /></div>
      <h2>{dragging ? "Drop to add your images" : "Smaller files. Every detail considered."}</h2>
      <p>Drop images or folders here, or paste an image from your clipboard.</p>
      <div className={styles.actions}><button className={styles.primary} type="button" onClick={() => input.current?.click()} disabled={importing}><FileImage size={16} />Choose images</button><button className={styles.secondary} type="button" onClick={() => folder.current?.click()} disabled={importing}><FolderOpen size={16} />Choose folder</button></div>
      <p className={styles.hint}>JPEG, PNG, WebP, AVIF · 20 MB per file · Up to {Math.round(maxPixels / 1e6)} MP</p>
      <button type="button" className={styles.textButton} onClick={sample} disabled={importing}>Try a sample image <span aria-hidden>↗</span></button>
    </section>

    <section className={styles.card} aria-labelledby="compressor-settings">
      <div className={styles.cardHeading}><div><h2 id="compressor-settings">Compression settings</h2><p>Choose a format, then fine-tune the balance.</p></div><button className={styles.iconButton} type="button" aria-label="Reset settings" disabled={busy} onClick={() => { setSettings({ ...DEFAULTS }); setExperimental(false); }}><RotateCcw size={16} /></button></div>
      <fieldset disabled={busy} className={styles.settingsFields}>
        <legend className={styles.hidden}>Output settings</legend>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>Output format<select value={settings.format} onChange={e => changeFormat(e.target.value as Format)}><option value="webp">WebP · versatile</option><option value="jpeg">JPEG · widely compatible</option><option value="avif">AVIF · compact</option><option value="png">PNG · pixel-preserving</option>{experimental && <option value="jxl">JPEG XL · experimental</option>}</select></label>
          <label className={styles.field}>Starting point<select value="" onChange={e => { const q = settings.format === "avif" ? { balanced: 60, smaller: 40, quality: 80 } : { balanced: 80, smaller: 60, quality: 92 }; update("quality", q[e.target.value as keyof typeof q]); }} disabled={settings.format === "png"}><option value="" disabled>Choose a preset</option><option value="balanced">Balanced</option><option value="smaller">Smaller file</option><option value="quality">Higher quality</option></select></label>
        </div>
        {settings.format === "png" ? <p className={styles.explainer}>Original-size PNGs use OxiPNG with transparent RGB preservation. Resized or converted images are normalized to 8-bit sRGB first. File-size savings vary.</p> : <label className={styles.rangeLabel}><span>Quality <output>{settings.quality}</output></span><input type="range" min="1" max="100" value={settings.quality} onChange={e => update("quality", +e.target.value)} disabled={settings.targetKB > 0} /><span className={styles.rangeEnds}><span>Smaller file</span><span>More detail</span></span></label>}
        <details className={styles.advanced}><summary>Advanced settings <span>Size, resize, effort & privacy</span></summary>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>Target size (KB)<input type="number" min="0" max="20000" step="1" value={settings.targetKB || ""} placeholder="Optional" disabled={settings.format === "png"} onChange={e => update("targetKB", e.target.value ? Number(e.target.value) : 0)} /><small>Decimal KB. Up to 8 attempts; a target is not guaranteed.</small></label>
            <label className={styles.field}>Minimum search quality<input type="number" min="1" max="100" step="1" value={settings.minQuality} disabled={!settings.targetKB} onChange={e => update("minQuality", Number(e.target.value))} /><small>The search won't go below this quality setting.</small></label>
            <label className={styles.field}>Maximum width (px)<input type="number" min="0" max="8000" step="1" value={settings.maxWidth || ""} placeholder="Original width" onChange={e => update("maxWidth", e.target.value ? Number(e.target.value) : 0)} /></label>
            <label className={styles.field}>Maximum height (px)<input type="number" min="0" max="8000" step="1" value={settings.maxHeight || ""} placeholder="Original height" onChange={e => update("maxHeight", e.target.value ? Number(e.target.value) : 0)} /></label>
            <label className={styles.field}>Encoding effort<select value={settings.effort} disabled={settings.format === "jpeg" || settings.format === "jxl"} onChange={e => update("effort", e.target.value as Settings["effort"])}><option value="fast">Fast</option><option value="balanced">Balanced</option><option value="thorough">Thorough · slower</option></select><small>JPEG uses optimized defaults; JPEG XL uses effort 7.</small></label>
            <label className={styles.field}>JPEG background<div className={styles.colorField}><input type="color" aria-label="JPEG background color" value={settings.matte} disabled={settings.format !== "jpeg"} onChange={e => update("matte", e.target.value)} /><span>{settings.matte.toUpperCase()}</span></div><small>Other output formats preserve transparency.</small></label>
          </div>
          <p className={styles.hint}>Resizing preserves aspect ratio and never enlarges the source.</p>
          <label className={styles.checkLabel}><input type="checkbox" checked={settings.preservePngMetadata} disabled={settings.format !== "png" || !!settings.maxWidth || !!settings.maxHeight} onChange={e => update("preservePngMetadata", e.target.checked)} /><span>Preserve original PNG metadata<small>Only original-size PNG optimization. Metadata may include private information. Conversions remove descriptive metadata.</small></span></label>
          <label className={styles.checkLabel}><input type="checkbox" checked={experimental} onChange={e => { setExperimental(e.target.checked); if (!e.target.checked && settings.format === "jxl") changeFormat("webp"); }} /><span>Show experimental JPEG XL<small>Check compatibility with the app or engine receiving the file.</small></span></label>
        </details>
      </fieldset>
      <div className={styles.settingsFooter}><p><ShieldCheck size={15} />Files stay on your device</p><button className={styles.primary} type="button" onClick={() => busy ? cancel() : start()} disabled={!items.length || archive !== null}>{busy ? <><X size={16} />Cancel batch</> : <><ImageDown size={16} />Compress {items.length ? `all ${items.length}` : "images"}</>}</button></div>
    </section>

    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}><X size={14} /></button></div>}
    <section className={styles.card} aria-label="Image queue">
      <div className={styles.cardHeading}><div><h2>Your images <span className={styles.count}>{items.length}</span></h2><p>{done.length ? `${done.length} complete · ${bytes(before)} → ${bytes(after)}${before ? ` · ${Math.abs(percent).toFixed(1)}% ${percent >= 0 ? "smaller" : "larger"}` : ""}` : "Results appear here after compression."}</p></div>{!!items.length && <button className={styles.textButton} type="button" onClick={clear} disabled={archive !== null}>Clear all</button>}</div>
      {!items.length ? <div className={styles.empty}><FileImage size={28} strokeWidth={1.25} /><p>Add an image to get started.</p><span>Original files are always kept untouched.</span></div> : <ul className={styles.queue}>{items.map(item => <li key={item.id} className={selectedItem?.id === item.id ? styles.selectedRow : ""}>
        <div className={styles.fileIcon}>{item.state === "working" ? <Loader2 size={18} className={styles.spin} /> : item.state === "done" ? <Check size={18} /> : <FileImage size={18} />}</div>
        <div className={styles.fileInfo}><button type="button" className={styles.fileName} disabled={!item.result} onClick={() => setSelected(item.id)} title={item.path}>{item.path}</button><p>{bytes(item.file.size)}{item.result ? ` → ${bytes(item.result.blob.size)} · ${item.settings?.format.toUpperCase()}` : ` · ${item.phase || (item.state === "ready" ? "Ready to compress" : item.state)}`}</p>{item.error && <p className={styles.error} role="alert">{item.error}</p>}{item.result && JSON.stringify(item.settings) !== JSON.stringify(settings) && <span className={styles.muted}>Uses previous settings. Compress again to update.</span>}{item.result && !item.result.targetMet && <span className={styles.error}>Target not reached</span>}</div>
        <div className={styles.rowActions}>{item.result && <button type="button" className={styles.iconButton} aria-label={`Download ${item.file.name}`} onClick={() => downloadItem(item)}><ArrowDownToLine size={17} /></button>}{["error", "cancelled"].includes(item.state) && <button type="button" className={styles.iconButton} aria-label={`Retry ${item.file.name}`} disabled={busy} onClick={() => start([item.id])}><RotateCcw size={16} /></button>}<button type="button" className={styles.iconButton} aria-label={`Remove ${item.file.name}`} disabled={archive !== null} onClick={() => remove(item.id)}><Trash2 size={16} /></button></div>
      </li>)}</ul>}
      {!!done.length && <div className={styles.queueFooter}><span>{archive !== null ? `Preparing ZIP · ${archive} of ${done.length}` : "ZIP includes folders and a JSON report."}</span><button className={styles.secondary} type="button" disabled={busy} onClick={() => archive !== null ? zipAbort.current?.abort() : void archiveResults()}>{archive !== null ? <><X size={15} />Cancel ZIP</> : <><ArrowDownToLine size={15} />Download all</>}</button></div>}
      <p className={styles.hidden} aria-live="polite" aria-atomic="true">{busy ? `${done.length} images complete. Compression in progress.` : `${done.length} images complete.`}</p>
    </section>
    {selectedItem && <Compare key={selectedItem.id} item={selectedItem} />}
    <Offline onNotice={setNotice} />
    <p className={styles.footnote}>Still images only. For normal maps, masks and pixel-critical sprites, use original-size PNG optimization. Modern formats should be checked against your game's runtime support.</p>
  </div>;
}
