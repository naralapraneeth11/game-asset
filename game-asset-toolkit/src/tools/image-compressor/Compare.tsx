"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { Item } from "./useCompressor";
import { bytes, savings } from "./engine/core";
import styles from "./ImageCompressor.module.css";

export default function Compare({ item }: { item: Item }) {
  const result = item.result!, viewport = useRef<HTMLDivElement>(null);
  const [urls, setUrls] = useState({ before: "", after: "" }), [split, setSplit] = useState(50), [zoom, setZoom] = useState<number | null>(null);
  const [available, setAvailable] = useState(600), [backdrop, setBackdrop] = useState("checker"), [previewError, setPreviewError] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  useEffect(() => {
    const before = URL.createObjectURL(result.reference), after = URL.createObjectURL(result.preview);
    setUrls({ before, after }); setPreviewError(false); setZoom(null); setSplit(50);
    return () => { URL.revokeObjectURL(before); URL.revokeObjectURL(after); };
  }, [result]);
  useEffect(() => {
    const el = viewport.current; if (!el) return;
    const observer = new ResizeObserver(() => setAvailable(el.clientWidth)); observer.observe(el); setAvailable(el.clientWidth);
    return () => observer.disconnect();
  }, []);
  const scale = zoom === null ? Math.min(1, Math.max(1, available - 24) / result.width, 376 / result.height) : zoom / 100;
  const percent = savings(item.file.size, result.blob.size);
  return <section className={styles.card} aria-label="Before and after comparison">
    <div className={styles.cardHeading}><div><h2>Compare the result</h2><p className={styles.truncate} title={item.path}>{item.file.name} · {result.width} × {result.height}</p></div><span className={styles.pill}>{percent >= 0 ? `${percent.toFixed(1)}% smaller` : `${Math.abs(percent).toFixed(1)}% larger`}</span></div>
    <div className={styles.compareToolbar}>
      <div className={styles.buttonGroup}><button type="button" aria-pressed={zoom === null} onClick={() => setZoom(null)}>Fit</button><button type="button" aria-pressed={zoom === 100} onClick={() => setZoom(100)}>100%</button><button type="button" aria-label="Zoom out" onClick={() => setZoom(Math.max(10, Math.round(scale * 100) - 25))}>−</button><button type="button" aria-label="Zoom in" onClick={() => setZoom(Math.min(400, Math.round(scale * 100) + 25))}>+</button></div>
      <span className={styles.muted}>{Math.round(scale * 100)}%</span>
      <div className={styles.buttonGroup}><button type="button" aria-pressed={backdrop === "checker"} onClick={() => setBackdrop("checker")}>Checker</button><button type="button" aria-pressed={backdrop === "light"} onClick={() => setBackdrop("light")}>Light</button><button type="button" aria-pressed={backdrop === "dark"} onClick={() => setBackdrop("dark")}>Dark</button></div>
    </div>
    <div ref={viewport} className={`${styles.viewport} ${styles[backdrop]}`} tabIndex={0} aria-label="Image preview. Scroll to pan when zoomed, or use the pan buttons."
      onPointerDown={e => { if (e.button !== 0 || e.pointerType === "touch") return; const el = e.currentTarget; drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }; el.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { const d = drag.current; if (d) { e.currentTarget.scrollLeft = d.left - (e.clientX - d.x); e.currentTarget.scrollTop = d.top - (e.clientY - d.y); } }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {previewError ? <p className={styles.previewError}>This browser could not display the comparison. The encoded file is still available to download.</p> : <div className={styles.surface} style={{ width: result.width * scale, height: result.height * scale }}>
        {urls.before && <img src={urls.before} alt="Original image, fitted to output dimensions" draggable={false} onError={() => setPreviewError(true)} />}
        <div className={styles.reveal} style={{ clipPath: `inset(0 0 0 ${split}%)` }}>{urls.after && <img src={urls.after} alt="Compressed result" draggable={false} onError={() => setPreviewError(true)} />}</div>
        <div className={styles.divider} style={{ left: `${split}%` }} />
      </div>}
    </div>
    <div className={styles.compareFooter}><span>Original · {bytes(item.file.size)}</span><span>Compressed · {bytes(result.blob.size)}</span></div>
    <label className={styles.compareSlider}>Before / after<input type="range" min={0} max={100} value={split} onChange={e => setSplit(+e.target.value)} aria-label="Before and after split position" /></label>
    <div className={styles.panControls}><span className={styles.muted}>Pan at 100% or above</span>{([[-100, 0, "←", "Pan left"], [100, 0, "→", "Pan right"], [0, -100, "↑", "Pan up"], [0, 100, "↓", "Pan down"]] as const).map(([left, top, label, title]) => <button key={title} type="button" aria-label={title} onClick={() => viewport.current?.scrollBy({ left, top })}>{label}</button>)}</div>
    <div className={styles.resultDetails}><span>{result.pixelPreserving ? "Original PNG pixels preserved" : "8-bit sRGB conversion"}</span><span>{(result.elapsed / 1000).toFixed(1)} s{result.quality !== null ? ` · Quality ${result.quality}` : ""}</span></div>
    {!!result.warnings.length && <ul className={styles.notes}>{result.warnings.map(note => <li key={note}>{note}</li>)}</ul>}
  </section>;
}
