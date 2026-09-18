"use client";

import { useEffect, useRef, useState, type CSSProperties, type Dispatch, type PointerEvent, type SetStateAction } from "react";
import { Crop, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { CropRect, QueueItem, VideoSettings } from "../types";
import { time } from "./Controls";
import s from "../VideoEditor.module.css";

function useObjectURL(blob?: Blob | null) {
  const [url, setURL] = useState("");
  useEffect(() => { if (!blob) { setURL(""); return; } const next = URL.createObjectURL(blob); setURL(next); return () => URL.revokeObjectURL(next); }, [blob]);
  return url;
}

type Drag = { kind: string; startX: number; startY: number; crop: CropRect; x: number; y: number };
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function Preview({ item, settings, setSettings, watermark, disabled, onTime }: { item: QueueItem; settings: VideoSettings; setSettings: Dispatch<SetStateAction<VideoSettings>>; watermark: File | null; disabled: boolean; onTime: (time: number) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [size, setSize] = useState({ width: 600, height: 338 });
  const [cropping, setCropping] = useState(false);
  const [output, setOutput] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [previewMuted, setPreviewMuted] = useState(true);
  const [playError, setPlayError] = useState("");
  const [watermarkRatio, setWatermarkRatio] = useState(1);
  const [textLayout, setTextLayout] = useState({ text: "", fontSize: 18, x: 0, y: 0 });
  const sourceURL = useObjectURL(item.file);
  const outputURL = useObjectURL(item.result?.blob);
  const watermarkURL = useObjectURL(watermark);
  const showingOutput = output && !!item.result;
  const isAudio = showingOutput && /\.(mp3|wav|aac)$/i.test(item.result!.filename);
  const isGIF = showingOutput && /\.gif$/i.test(item.result!.filename);
  const width = item.info?.width || 1920;
  const height = item.info?.height || 1080;
  const quarter = settings.rotate === 90 || settings.rotate === 270;
  const sourceRatio = width / height;
  const cropRatio = sourceRatio * settings.crop.width / settings.crop.height;
  const ratio = showingOutput ? ((item.result?.width || width) / (item.result?.height || height)) : cropping ? sourceRatio : quarter ? 1 / cropRatio : cropRatio;
  const duration = showingOutput ? item.result?.duration || 0 : item.info?.duration || 0;
  const trimEnd = Math.min(settings.trimEnd || duration, duration);
  const trimStart = Math.min(settings.trimStart, Math.max(0, trimEnd - 0.01));

  useEffect(() => { setOutput(false); setCropping(false); setPlaying(false); setPosition(0); setPlayError(""); onTime(0); }, [item.id, onTime]);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(frame.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!watermarkURL) return;
    const img = new Image(); img.onload = () => setWatermarkRatio(img.width / img.height || 1); img.src = watermarkURL;
    return () => { img.onload = null; img.src = ""; };
  }, [watermarkURL]);
  useEffect(() => {
    const element = video.current; if (!element) return;
    element.playbackRate = showingOutput ? 1 : settings.speed;
    element.preservesPitch = showingOutput || settings.preservePitch;
    element.volume = showingOutput ? 1 : Math.min(1, settings.volume);
    element.muted = previewMuted || (!showingOutput && settings.mute);
  }, [settings.speed, settings.preservePitch, settings.volume, settings.mute, previewMuted, showingOutput, sourceURL]);

  useEffect(() => {
    const context = document.createElement("canvas").getContext("2d");
    if (!context || !settings.text.trim()) return;
    const margin = Math.max(1, Math.min(size.width, size.height) * 0.025);
    const wrap = () => {
      const lines: string[] = [];
      for (const paragraph of settings.text.trim().replace(/\r\n?/g, "\n").split("\n")) {
        let line = "";
        for (const character of paragraph) { if (line && context.measureText(line + character).width > size.width - 2 * margin) { lines.push(line); line = character; } else line += character; }
        lines.push(line);
      }
      return lines;
    };
    let fontSize = Math.max(2, size.height * settings.fontSize / 100);
    context.font = `600 ${fontSize}px ${settings.font}`;
    let lines = wrap();
    while (lines.length * fontSize * 1.25 > size.height - margin * 2 && fontSize > 2) { fontSize = Math.max(2, fontSize * 0.85); context.font = `600 ${fontSize}px ${settings.font}`; lines = wrap(); }
    const width = Math.max(...lines.map((line) => context.measureText(line).width)), height = lines.length * fontSize * 1.25;
    setTextLayout({ text: lines.join("\n"), fontSize, x: clamp(settings.textX * size.width, margin + width / 2, size.width - margin - width / 2), y: clamp(settings.textY * size.height, margin + height / 2, size.height - margin - height / 2) });
  }, [settings.text, settings.font, settings.fontSize, settings.textX, settings.textY, size.width, size.height]);

  const seek = (value: number) => { if (video.current) video.current.currentTime = value; setPosition(value); if (!showingOutput) onTime(value); };
  const play = async () => {
    const element = video.current; if (!element) return;
    if (!element.paused) { element.pause(); return; }
    if (!showingOutput && (element.currentTime < trimStart || element.currentTime >= trimEnd)) element.currentTime = trimStart;
    try { await element.play(); setPlayError(""); } catch { setPlayError("Your browser cannot preview this source codec. You can still try exporting through the compatibility engine."); }
  };

  const begin = (event: PointerEvent<HTMLButtonElement>, kind: string) => {
    if (disabled || showingOutput) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { kind, startX: event.clientX, startY: event.clientY, crop: { ...settings.crop }, x: kind === "text" ? settings.textX : settings.watermarkX, y: kind === "text" ? settings.textY : settings.watermarkY };
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current; const bounds = frame.current?.getBoundingClientRect(); if (!current || !bounds) return;
    const dx = (event.clientX - current.startX) / bounds.width, dy = (event.clientY - current.startY) / bounds.height;
    if (current.kind === "text" || current.kind === "watermark") {
      const key = current.kind;
      setSettings((previous) => ({ ...previous, [`${key}X`]: clamp(current.x + dx), [`${key}Y`]: clamp(current.y + dy) })); return;
    }
    const old = current.crop; let crop = { ...old };
    if (current.kind === "move") crop = { ...old, x: clamp(old.x + dx, 0, 1 - old.width), y: clamp(old.y + dy, 0, 1 - old.height) };
    else {
      let left = old.x, right = old.x + old.width, top = old.y, bottom = old.y + old.height;
      if (current.kind.includes("w")) left = clamp(old.x + dx, 0, right - 0.02);
      if (current.kind.includes("e")) right = clamp(right + dx, left + 0.02, 1);
      if (current.kind.includes("n")) top = clamp(old.y + dy, 0, bottom - 0.02);
      if (current.kind.includes("s")) bottom = clamp(bottom + dy, top + 0.02, 1);
      crop = { x: left, y: top, width: right - left, height: bottom - top };
    }
    setSettings((previous) => ({ ...previous, crop }));
  };
  const dragProps = (kind: string) => ({ onPointerDown: (event: PointerEvent<HTMLButtonElement>) => begin(event, kind), onPointerMove: move, onPointerUp: () => { drag.current = null; }, onPointerCancel: () => { drag.current = null; } });
  const nudge = (kind: "text" | "watermark", key: string, shift: boolean) => {
    const step = shift ? 0.05 : 0.01;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return false;
    setSettings((previous) => ({ ...previous, [`${kind}X`]: clamp(previous[`${kind}X`] + (key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0)), [`${kind}Y`]: clamp(previous[`${kind}Y`] + (key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0)) })); return true;
  };
  const look = settings.look === "warm" ? "sepia(.16) saturate(1.12)" : settings.look === "cool" ? "saturate(.9) hue-rotate(8deg)" : settings.look === "mono" ? "grayscale(1)" : settings.look === "cinema" ? "contrast(1.12) saturate(.8)" : "";
  const filter = `brightness(${Math.max(0, 1 + settings.brightness) * 2 ** settings.exposure}) contrast(${settings.contrast}) saturate(${settings.saturation}) ${look}`;
  const crop = cropping || showingOutput ? { x: 0, y: 0, width: 1, height: 1 } : settings.crop;
  const watermarkWidth = Math.min(settings.watermarkWidth * size.width, size.height * watermarkRatio);
  const watermarkHeight = watermarkWidth / watermarkRatio;
  const watermarkLeft = clamp(settings.watermarkX * size.width, watermarkWidth / 2, size.width - watermarkWidth / 2);
  const watermarkTop = clamp(settings.watermarkY * size.height, watermarkHeight / 2, size.height - watermarkHeight / 2);
  const innerStyle: CSSProperties = cropping || showingOutput ? { width: "100%", height: "100%" } : { width: quarter ? size.height : size.width, height: quarter ? size.width : size.height, transform: `translate(-50%, -50%) scale(${settings.flipX ? -1 : 1}, ${settings.flipY ? -1 : 1}) rotate(${settings.rotate}deg)`, left: "50%", top: "50%" };

  return <section className={s.preview} aria-label="Video preview">
    <div className={s.previewToolbar}><div className={s.segment}><button type="button" aria-pressed={!showingOutput} onClick={() => { setOutput(false); setPlayError(""); }}>Live preview</button><button type="button" aria-pressed={showingOutput} disabled={!item.result} onClick={() => { setOutput(true); setCropping(false); setPlayError(""); }}>Exported result</button></div>{!showingOutput && <button type="button" className={s.smallButton} aria-pressed={cropping} disabled={disabled} onClick={() => setCropping(!cropping)}><Crop size={14} />{cropping ? "Preview edits" : "Adjust crop"}</button>}</div>
    <div className={s.previewBackdrop}><div ref={frame} className={s.previewFrame} style={{ aspectRatio: ratio, width: `min(100%, calc(55vh * ${ratio}), ${520 * ratio}px)` }} tabIndex={0} aria-label="Video preview. Press Space to play or pause; arrow keys seek five seconds." onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.code === "Space") { event.preventDefault(); void play(); } if (event.code === "ArrowRight" || event.code === "ArrowLeft") { event.preventDefault(); seek(clamp(position + (event.code === "ArrowRight" ? 5 : -5), 0, duration)); } }}>
      {isGIF ? <div className={s.gifPreview} role="img" aria-label="Exported animated GIF" style={{ backgroundImage: `url(${outputURL})` }} /> : <div className={s.videoCrop} style={innerStyle}><video ref={video} key={showingOutput ? outputURL : sourceURL} src={showingOutput ? outputURL : sourceURL || undefined} playsInline preload="metadata" muted={previewMuted} className={isAudio ? s.audioVideo : s.video} style={{ width: `${100 / crop.width}%`, height: `${100 / crop.height}%`, left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%`, filter: showingOutput ? undefined : filter }} onLoadedMetadata={() => { setPlaying(false); if (!showingOutput) seek(trimStart); }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setPlayError("This browser cannot preview this codec. Export may still work using the compatibility engine.")} onTimeUpdate={() => { const element = video.current; if (!element) return; if (!showingOutput && element.currentTime >= trimEnd && !element.paused) element.pause(); setPosition(element.currentTime); if (!showingOutput) onTime(element.currentTime); }} /></div>}
      {isAudio && <div className={s.audioPlaceholder}><Volume2 size={36} /><span>Audio export</span><small>{item.result?.filename}</small></div>}
      {!showingOutput && cropping && <div className={s.cropBox} style={{ left: `${settings.crop.x * 100}%`, top: `${settings.crop.y * 100}%`, width: `${settings.crop.width * 100}%`, height: `${settings.crop.height * 100}%` }}><button type="button" className={s.cropMove} disabled={disabled} aria-label="Move crop area. Numeric crop controls are below." {...dragProps("move")} /><div className={s.cropGrid} />{["nw", "ne", "sw", "se"].map((corner) => <button key={corner} type="button" disabled={disabled} aria-label={`Resize ${corner} crop corner. Use crop width and height fields for keyboard adjustments.`} className={`${s.cropHandle} ${s[corner]}`} {...dragProps(corner)} />)}</div>}
      {!showingOutput && !cropping && settings.text && <button type="button" disabled={disabled} className={s.textOverlay} title="Drag to position; arrow keys move by 1%, Shift + arrows by 5%." aria-label="Move text overlay" style={{ left: textLayout.x, top: textLayout.y, color: settings.textColor, fontFamily: settings.font, fontSize: textLayout.fontSize, opacity: settings.textOpacity }} {...dragProps("text")} onKeyDown={(event) => { if (nudge("text", event.key, event.shiftKey)) event.preventDefault(); }}>{textLayout.text}</button>}
      {!showingOutput && !cropping && watermarkURL && <button type="button" disabled={disabled} className={s.watermarkOverlay} title="Drag to position; arrow keys move by 1%, Shift + arrows by 5%." aria-label="Move watermark" style={{ left: watermarkLeft, top: watermarkTop, width: watermarkWidth, aspectRatio: watermarkRatio, opacity: settings.watermarkOpacity, backgroundImage: `url(${watermarkURL})` }} {...dragProps("watermark")} onKeyDown={(event) => { if (nudge("watermark", event.key, event.shiftKey)) event.preventDefault(); }} />}
    </div></div>
    {!isGIF && <div className={s.transport}><button type="button" className={s.iconButton} aria-label={playing ? "Pause" : "Play"} onClick={() => void play()}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><button type="button" className={s.iconButton} aria-label="Return to trim start" onClick={() => seek(showingOutput ? 0 : trimStart)}><RotateCcw size={15} /></button><span className={s.time}>{time(position)}</span><input type="range" min={0} max={duration || 1} step={0.01} value={Math.min(position, duration || 1)} aria-label="Playback position" onChange={(event) => seek(Number(event.target.value))} /><span className={s.time}>{time(duration)}</span><button type="button" className={s.iconButton} aria-label={previewMuted ? "Unmute preview" : "Mute preview"} aria-pressed={!previewMuted} onClick={() => setPreviewMuted(!previewMuted)}>{previewMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button><button type="button" className={s.iconButton} aria-label="Fullscreen preview" onClick={() => { void frame.current?.parentElement?.requestFullscreen?.().catch(() => setPlayError("Fullscreen is not available in this browser.")); }}><Maximize size={16} /></button></div>}
    <div className={s.previewCaption}><span>{showingOutput ? "Final exported file" : cropping ? "Crop the source frame. Rotation and overlays apply after cropping." : "Live colors and audio gain are approximate. Check Exported result for the final output."}</span>{!showingOutput && <span>{width} × {height}</span>}</div>
    {playError && <p className={s.inlineWarning} role="status">{playError}</p>}
  </section>;
}
