"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Download, FileImage, Grid2X2, LoaderCircle, Scissors, Sparkles, X } from "lucide-react";
import { AdvancedPanel } from "@/components/tool/AdvancedPanel";
import { DropZone } from "@/components/tool/DropZone";
import { buttonClass } from "@/components/tool/buttons";
import Toggle from "@/components/ui/Toggle";
import { formatBytes } from "@/lib/format";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { downloadBlob } from "@/tools/local-files/download";
import { splitGrid } from "./geometry";
import { GIF_DEFAULTS, SPLIT_DEFAULTS, type SpriteMode } from "./types";
import { useSpriteUtilities } from "./useSpriteUtilities";
import s from "./SpriteUtilities.module.css";

function NumberField({ label, value, min = 0, max, step = 1, onChange, hint }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void; hint?: string }) {
  const id = useId();
  return <label className={s.field} htmlFor={id}><span>{label}</span><input id={id} className={s.input} type="number" inputMode={step < 1 ? "decimal" : "numeric"} min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} aria-describedby={hint ? `${id}-hint` : undefined} />{hint && <span id={`${id}-hint`} className={s.hint}>{hint}</span>}</label>;
}

function SwitchField({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint: string; disabled: boolean }) {
  const id = useId();
  return <div className={s.toggle}><div className={s.toggleText}><label id={`${id}-label`} htmlFor={id}>{label}</label><span id={`${id}-hint`} className={s.hint}>{hint}</span></div><Toggle id={id} checked={checked} onChange={onChange} aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`} disabled={disabled} /></div>;
}

export default function SpriteUtilities({ mode }: { mode: SpriteMode }) {
  const tool = useSpriteUtilities(mode);
  const { file, info, gif, setGif, split, setSplit, result, busy, progress, error, message } = tool;
  const sourceUrl = useObjectUrl(info?.preview);
  const resultUrl = useObjectUrl(result?.preview);
  const [allFiles, setAllFiles] = useState(false);
  const isGif = mode === "gif";
  const gridState = useMemo(() => {
    if (!info || isGif) return { grid: null, error: "" };
    try { return { grid: splitGrid(info.width, info.height, split), error: "" }; }
    catch (error) { return { grid: null, error: error instanceof Error ? error.message : "Check the grid dimensions." }; }
  }, [info, isGif, split]);
  const gifCount = info ? Math.max(0, Math.ceil(((gif.end || info.frameCount) - gif.start + 1) / Math.max(1, gif.stride))) : 0;

  useEffect(() => { setAllFiles(false); }, [result]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); tool.run(); }
      if (event.key === "Escape" && busy) { event.preventDefault(); tool.cancel(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [tool.run, tool.cancel, busy]);

  return <div className={s.root}>
    <DropZone
      accept={isGif ? "image/gif,.gif" : "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"}
      multiple={false} disabled={busy} onFiles={tool.addFiles} compact={!!file}
      title={isGif ? "Turn an animation into game-ready sprites" : "Split a sprite sheet into individual PNGs"}
      hint={file ? "Drop a new file here to replace the current one" : isGif ? "GIF up to 32 MiB · transparent sprites · frame timing preserved" : "PNG, JPEG, or static WebP · up to 64 MiB and 16 megapixels"}
      icon={isGif ? <Sparkles size={24} aria-hidden /> : <Grid2X2 size={24} aria-hidden />}
      buttonLabel={isGif ? "Choose a GIF" : "Choose a sprite sheet"}
      footer={<span>Files stay on your device. No account, uploads, or watermark.</span>}
    />

    {file && <div className={s.fileBar}>
      <span className={s.fileIcon}>{busy && !info ? <LoaderCircle size={19} className="animate-spin" aria-hidden /> : <FileImage size={19} aria-hidden />}</span>
      <div className={s.fileText}><p className={s.fileName} title={file.name}>{file.name}</p><p className={s.hint}>{formatBytes(file.size)}{info ? ` · ${info.width} × ${info.height}${isGif ? ` · ${info.frameCount} frames · ${(info.durationMs / 1000).toFixed(2)} s` : ""}` : busy ? " · Reading image…" : " · Select this file again to retry"}</p></div>
      <button className={buttonClass("ghost", "sm")} type="button" onClick={tool.clear} aria-label="Remove file and clear results"><X size={17} aria-hidden /><span className="hidden sm:inline">Remove</span></button>
    </div>}

    {error && <p className={s.error} role="alert">{error}</p>}
    <span className={s.srOnly} role="status" aria-live="polite">{message}</span>

    {info && <div className={s.workbench}>
      <section className={s.panel} aria-label="Export settings">
        <div className={s.panelHeader}><h2>{isGif ? "Sprite sheet settings" : "Grid settings"}</h2><button className={s.reset} type="button" disabled={busy} onClick={() => isGif ? setGif(GIF_DEFAULTS) : setSplit({ ...SPLIT_DEFAULTS, columns: info.width % 4 === 0 ? 4 : 1, rows: info.height % 4 === 0 ? 4 : 1 })}>Reset</button></div>
        <fieldset disabled={busy} className={s.panelBody}>
          {isGif ? <>
            <div className={s.fields}>
              <NumberField label="First frame" value={gif.start} min={1} max={info.frameCount} onChange={start => setGif({ ...gif, start })} />
              <NumberField label="Last frame" value={gif.end} min={0} max={info.frameCount} hint="0 uses the final frame" onChange={end => setGif({ ...gif, end })} />
              <NumberField label="Export every Nth frame" value={gif.stride} min={1} max={5000} onChange={stride => setGif({ ...gif, stride })} />
              <label className={s.field}><span>Scale</span><select className={s.input} value={gif.scale} onChange={event => setGif({ ...gif, scale: Number(event.target.value) })}><option value={0.25}>25%</option><option value={0.5}>50%</option><option value={1}>100% · original</option><option value={2}>200% · pixel perfect</option><option value={3}>300% · pixel perfect</option><option value={4}>400% · pixel perfect</option></select></label>
            </div>
            <p className={s.hint}>{gifCount} frames selected. Sampling keeps the selected duration by combining skipped frame delays. Nearest-neighbor scaling keeps pixel edges sharp.</p>
            <AdvancedPanel summary={`${gif.columns || "Auto"} columns · ${gif.padding}px padding`}>
              <div className="grid gap-5">
                <div className={s.fields}>
                  <NumberField label="Columns" value={gif.columns} max={512} hint="0 chooses a near-square layout" onChange={columns => setGif({ ...gif, columns })} />
                  <NumberField label="Padding per edge" value={gif.padding} max={64} onChange={padding => setGif({ ...gif, padding })} />
                  <NumberField label="Maximum exported frames" value={gif.maxFrames} min={1} max={512} onChange={maxFrames => setGif({ ...gif, maxFrames })} />
                  <label className={s.field}><span>Background</span><select className={s.input} value={gif.background} onChange={event => setGif({ ...gif, background: event.target.value as "transparent" | "gif" })}><option value="transparent">Transparent</option><option value="gif" disabled={!info.background}>GIF palette background</option></select></label>
                </div>
                <SwitchField label="Include individual frames" checked={gif.includeFrames} onChange={includeFrames => setGif({ ...gif, includeFrames })} disabled={busy} hint="Adds each rendered sprite as a PNG alongside the atlas and JSON." />
                <p className={s.hint}>Transparent mode clears background-disposal regions to transparent. GIF palette mode restores the file’s global background color. Atlas: up to 16 megapixels, 8192px per side. Zero or missing delays use 100 ms.</p>
              </div>
            </AdvancedPanel>
          </> : <>
            <div className={s.segmented} aria-label="Grid sizing"><button type="button" className={s.segment} aria-pressed={split.sizing === "grid"} onClick={() => setSplit({ ...split, sizing: "grid" })}>Rows & columns</button><button type="button" className={s.segment} aria-pressed={split.sizing === "cell"} onClick={() => setSplit({ ...split, sizing: "cell" })}>Cell dimensions</button></div>
            <div className={s.fields}>
              {split.sizing === "grid" ? <><NumberField label="Columns" value={split.columns} min={1} max={1024} onChange={columns => setSplit({ ...split, columns })} /><NumberField label="Rows" value={split.rows} min={1} max={1024} onChange={rows => setSplit({ ...split, rows })} /></> : <><NumberField label="Cell width · px" value={split.cellWidth} min={1} max={8192} onChange={cellWidth => setSplit({ ...split, cellWidth })} /><NumberField label="Cell height · px" value={split.cellHeight} min={1} max={8192} onChange={cellHeight => setSplit({ ...split, cellHeight })} /></>}
              <NumberField label="Outer margin · px" value={split.margin} max={4096} onChange={margin => setSplit({ ...split, margin })} />
              <NumberField label="Gutter between cells · px" value={split.gutter} max={4096} onChange={gutter => setSplit({ ...split, gutter })} />
            </div>
            {gridState.grid && <p className={s.hint}>{gridState.grid.cells.length} cells selected · {gridState.grid.cellWidth} × {gridState.grid.cellHeight} pixels each{(gridState.grid.unusedRight || gridState.grid.unusedBottom) ? ` · Unused edge: ${gridState.grid.unusedRight}px right, ${gridState.grid.unusedBottom}px bottom` : ""}</p>}
            {gridState.error && <p className={s.error} role="status">{gridState.error}</p>}
            <AdvancedPanel summary={`${split.order === "row" ? "Row" : "Column"}-major · ${split.padding}px padding`}>
              <div className="grid gap-5">
                <div className={s.fields}>
                  <NumberField label="Horizontal offset · px" value={split.offsetX} max={info.width - 1} onChange={offsetX => setSplit({ ...split, offsetX })} />
                  <NumberField label="Vertical offset · px" value={split.offsetY} max={info.height - 1} onChange={offsetY => setSplit({ ...split, offsetY })} />
                  <NumberField label="First cell" value={split.start} min={1} max={1024} onChange={start => setSplit({ ...split, start })} />
                  <NumberField label="Cell count" value={split.count} max={1024} hint="0 exports through the final cell" onChange={count => setSplit({ ...split, count })} />
                  <NumberField label="Output padding · px" value={split.padding} max={128} onChange={padding => setSplit({ ...split, padding })} />
                  <label className={s.field}><span>Reading order</span><select className={s.input} value={split.order} onChange={event => setSplit({ ...split, order: event.target.value as "row" | "column" })}><option value="row">Rows · left to right</option><option value="column">Columns · top to bottom</option></select></label>
                </div>
                <SwitchField label="Skip transparent cells" checked={split.skipTransparent} onChange={skipTransparent => setSplit({ ...split, skipTransparent })} disabled={busy} hint="Only fully transparent cells are skipped. Original cell numbers stay in the filenames." />
                <p className={s.hint}>Offsets move the first cell inward from the top-left margin. Grid mode requires exact division; cell mode leaves incomplete right and bottom edges unused. Padding adds transparent space around each PNG.</p>
              </div>
            </AdvancedPanel>
          </>}
        </fieldset>
        <div className="border-t border-border px-5 py-4"><div className={s.actions}>
          <button type="button" className={buttonClass("primary", "lg", "flex-1")} disabled={busy || !!gridState.error} onClick={tool.run}>{isGif ? <Grid2X2 size={17} aria-hidden /> : <Scissors size={17} aria-hidden />}{isGif ? "Create sprite sheet" : "Split sprite sheet"}</button>
          {busy && <button type="button" className={buttonClass("secondary")} onClick={tool.cancel}>Cancel</button>}
        </div><p className="mt-2 text-center text-xs text-muted-foreground">⌘ / Ctrl + Enter to export · Esc to cancel</p></div>
      </section>

      <section className={`${s.panel} ${s.sticky}`} aria-label="Image preview">
        <div className={s.panelHeader}><h2>{result ? isGif ? "Generated sprite sheet" : "First exported sprite" : isGif ? "Source · first frame" : "Source · selected cells"}</h2><span className={s.hint}>Transparency grid</span></div>
        <div className={s.previewBody}>
          {resultUrl ? <img src={resultUrl} className={s.preview} alt={isGif ? "Generated sprite atlas" : "First extracted sprite with transparency"} /> : sourceUrl && (isGif ? <img src={sourceUrl} className={s.preview} alt="First composited frame of the source GIF" /> : <svg className={s.preview} viewBox={`0 0 ${info.width} ${info.height}`} role="img" aria-label={`Sprite sheet with ${gridState.grid?.cells.length || 0} selected cells outlined`}>
            <image href={sourceUrl} x={0} y={0} width={info.width} height={info.height} />
            {gridState.grid?.cells.map(cell => <rect key={cell.index} className={s.gridOutline} x={cell.x} y={cell.y} width={cell.width} height={cell.height}><title>Cell {cell.index + 1} · row {cell.row + 1}, column {cell.column + 1}</title></rect>)}
          </svg>)}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{result ? result.summary : isGif ? "Preview is the first source frame. Export composites every required frame with its original disposal behavior, then writes a timing manifest." : "Orange outlines show the cells selected for export. Preview is scaled; exported pixels keep their original resolution."}</p>
        </div>
      </section>
    </div>}

    {busy && <section className={s.progress} aria-label="Processing progress"><div className={s.progressLabel}><span role="status">{progress.label}</span><span>{Math.round(progress.value * 100)}%</span></div><progress max={1} value={progress.value} aria-label={progress.label} /><button type="button" className={`${s.reset} mt-3`} onClick={tool.cancel}>Cancel operation</button></section>}

    {result && <section className={s.panel} aria-label="Export results">
      <div className={s.panelHeader}><div><h2>Ready to use</h2><p className={s.hint}>{result.summary}</p></div><button type="button" className={buttonClass("primary", "md")} disabled={busy} onClick={() => void tool.downloadAll()}><Download size={16} aria-hidden />Download ZIP</button></div>
      <ul className={s.resultFiles}>{(allFiles ? result.files : result.files.slice(0, 12)).map(item => <li key={item.name}><div className={s.fileText}><p className={s.fileName} title={item.name}>{item.name}</p><p className={s.hint}>{formatBytes(item.blob.size)}</p></div><button type="button" className={buttonClass("secondary", "sm")} onClick={() => downloadBlob(item.blob, item.name.split("/").pop() || item.name)} aria-label={`Download ${item.name}`}><Download size={14} aria-hidden /><span className="hidden sm:inline">Download</span></button></li>)}</ul>
      {result.files.length > 12 && <div className="border-t border-border p-3 text-center"><button type="button" className={buttonClass("ghost", "sm")} onClick={() => setAllFiles(!allFiles)}>{allFiles ? "Show fewer files" : `Show all ${result.files.length} files`}</button></div>}
      {!!result.warnings.length && <ul className={`${s.warningList} border-t border-border px-5 py-4`}>{result.warnings.map(warning => <li key={warning} className={s.hint}>{warning}</li>)}</ul>}
    </section>}

    {info && !result && !!info.warnings.length && <ul className={s.note}>{info.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
    <p className={s.hint}>PNG output preserves transparency. Generated files remain in this tab until you remove the source, change settings, or leave the page. Download the ZIP to keep them.</p>
  </div>;
}

export { SpriteUtilities };
