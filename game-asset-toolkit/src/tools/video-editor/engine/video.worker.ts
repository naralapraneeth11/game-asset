import { expose, releaseProxy } from "comlink";
import { Zip, ZipPassThrough } from "fflate";
import { LIMITS, type CapabilityReport, type ExportRequest, type ExportResult, type MediaInfo, type ProgressUpdate, type VideoSettings } from "../types";
import { auditNative, cancelNative, nativeExport, nativeSnapshot, nativeSupport, probeNative } from "./native";
import { cancelFallback, disposeFallback, fallbackExport, fallbackFrame, probeFallback } from "./fallback";
import { cancelProbe } from "./metadata";
import { clearWorkspace, releaseOutput } from "./storage";
import { createFrameRenderer } from "./pixels";
import { errorText, geometry, isAudio } from "./shared";

let generation = 0;
let pending: Promise<unknown> = Promise.resolve();
function exclusive<T>(operation: (check: () => void) => Promise<T>): Promise<T> {
  const ticket = generation;
  const check = () => { if (ticket !== generation) throw new Error("Cancelled."); };
  const task = pending.catch(() => undefined).then(async () => { check(); return operation(check); });
  pending = task.catch(() => undefined);
  return task;
}

function validateFile(file: File) {
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > LIMITS.nativeInput) throw new Error("Choose a video smaller than 8 GiB.");
}
function validateRequest(request: ExportRequest) {
  validateFile(request.file);
  const s = request.settings;
  geometry(request.info, s);
  if (!["mp4", "mov", "webm", "gif", "mp3", "aac", "wav"].includes(s.format)) throw new Error("Unsupported output format.");
  if (request.info.width * request.info.height > 4096 * 4096) throw new Error("The source exceeds the 16 megapixel decode limit. Use a source at 4K or below.");
  if (s.format === "webm" && !["vp9", "av1"].includes(s.codec)) throw new Error("WebM requires VP9 or AV1.");
  if (s.format === "mov" && !["h264", "hevc"].includes(s.codec)) throw new Error("MOV requires H.264 or HEVC.");
  if (s.format === "mp4" && !["h264", "hevc", "av1"].includes(s.codec)) throw new Error("MP4 requires H.264, HEVC, or AV1.");
  if (!isAudio(s.format) && request.info.warnings.some((message) => /HDR|wide.gamut/i.test(message))) throw new Error("This version exports SDR video. HDR and wide-gamut sources require explicit tone mapping first.");
}

export const videoEngine = {
  async audit(): Promise<CapabilityReport> {
    const notes: string[] = [];
    let opfs = false, rust = false;
    try { await navigator.storage.getDirectory(); opfs = true; } catch { notes.push("Disk storage is unavailable; native output is limited to 128 MiB."); }
    try {
      const response = await fetch("/tools/video-editor/pixel-ops.wasm", { credentials: "same-origin" });
      rust = response.ok && WebAssembly.validate(await response.arrayBuffer());
    } catch { /* Report asset availability; edits give an actionable load error. */ }
    if (!rust) notes.push("Color engine asset is unavailable. Run the video preparation script.");
    if (!self.crossOriginIsolated) notes.push("Compatibility mode uses one thread. Reload this page directly to enable isolation where supported.");
    return { native: await auditNative(), opfs, rust, isolated: self.crossOriginIsolated, wasm: typeof WebAssembly !== "undefined", notes };
  },
  probe(file: File): Promise<MediaInfo> {
    return exclusive(async (check) => {
      validateFile(file);
      let info: MediaInfo;
      try { info = await probeNative(file); }
      catch (error) {
        check();
        if (file.size > LIMITS.fallbackInput) throw new Error(`Native inspection failed: ${errorText(error)} Compatibility inspection accepts up to 256 MiB.`);
        info = await probeFallback(file);
      }
      check();
      if (info.width < 2 || info.height < 2) throw new Error("Choose a file containing a video track.");
      if (info.width * info.height > 4096 * 4096) throw new Error("The source exceeds the 16 megapixel decode limit. Choose a source at 4K or below.");
      return info;
    });
  },
  run(request: ExportRequest, progress: (update: ProgressUpdate) => void): Promise<ExportResult> {
    return exclusive(async (check) => {
      validateRequest(request);
      const support = await nativeSupport(request);
      check();
      let reason = support.reason;
      if (support.supported) {
        try { const result = await nativeExport(request, progress); check(); return result; }
        catch (error) { check(); reason = errorText(error); }
      }
      check();
      if (request.file.size > LIMITS.fallbackInput) throw new Error(`${reason} This operation needs compatibility mode, which accepts files up to 256 MiB. Try standard speed, unmodified audio, and a supported native codec.`);
      if (request.settings.codec === "av1" && !isAudio(request.settings.format) && request.settings.format !== "gif") throw new Error(`${reason} AV1 requires a working native encoder. Select H.264 or VP9.`);
      progress({ phase: "Preparing compatibility export", progress: null, engine: "ffmpeg", detail: reason });
      const result = await fallbackExport(request, progress);
      check();
      result.warnings.unshift(`Compatibility engine: ${reason}`);
      return result;
    }).finally(() => { (progress as unknown as { [releaseProxy]?: () => void })[releaseProxy]?.(); });
  },
  snapshot(file: File, info: MediaInfo, settings: VideoSettings, watermark: File | null, format: "png" | "jpeg", time: number): Promise<Blob> {
    return exclusive(async (check) => {
      const s: VideoSettings = { ...settings, format: "mp4", codec: "h264", targetMB: 0, trimStart: 0, trimEnd: 0, speed: 1 };
      validateRequest({ id: "snapshot", file, info, settings: s, watermark });
      const position = Math.max(0, Math.min(info.duration - 0.001, Number.isFinite(time) ? time : 0));
      try { const blob = await nativeSnapshot(file, info, s, watermark, format, position); check(); return blob; }
      catch { check(); }
      const source = await fallbackFrame(file, position);
      check();
      const bitmap = await createImageBitmap(source);
      let renderer: Awaited<ReturnType<typeof createFrameRenderer>> | undefined;
      try {
        renderer = await createFrameRenderer(info, s, watermark);
        const canvas = await renderer.renderFromSource(bitmap, bitmap.width, bitmap.height);
        check();
        return await canvas.convertToBlob({ type: `image/${format}`, quality: 0.94 });
      } finally { bitmap.close(); renderer?.dispose(); }
    });
  },
  zip(files: { blob: Blob; filename: string }[]): Promise<Blob> {
    return exclusive(async (check) => {
      if (!files.length) throw new Error("Export some videos first.");
      if (files.reduce((sum, file) => sum + file.blob.size, 0) > LIMITS.batchZip) throw new Error("ZIP downloads are limited to 256 MiB. Save larger exports individually.");
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let failed: Error | undefined, size = 0;
      const archive = new Zip((error, data) => {
        if (error) { failed = error; return; }
        size += data.byteLength;
        if (size > LIMITS.batchZip + 1024 * 1024) { failed = new Error("ZIP exceeded its memory limit."); return; }
        chunks.push(data as Uint8Array<ArrayBuffer>);
      });
      const used = new Set<string>();
      try {
        for (const file of files) {
          check();
          const safe = file.filename.replace(/[\\/\u0000-\u001f]/g, "_");
          let name = safe, index = 2;
          while (used.has(name)) { const dot = safe.lastIndexOf("."); name = dot > 0 ? `${safe.slice(0, dot)}_${index++}${safe.slice(dot)}` : `${safe}_${index++}`; }
          used.add(name);
          const entry = new ZipPassThrough(name);
          archive.add(entry);
          const reader = file.blob.stream().getReader();
          try {
            while (true) {
              check();
              const { value, done } = await reader.read();
              if (done) break;
              entry.push(value, false);
              if (failed) throw failed;
            }
            entry.push(new Uint8Array(), true);
          } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
        }
        archive.end();
        if (failed) throw failed;
        check();
        return new Blob(chunks, { type: "application/zip" });
      } finally { archive.terminate(); }
    });
  },
  async cancel(): Promise<void> { generation++; cancelProbe(); cancelFallback(); await cancelNative(); },
  release(id: string): Promise<void> { return releaseOutput(id); },
  clear(): Promise<void> { return exclusive(async () => { disposeFallback(); await clearWorkspace(); }); },
  async dispose(): Promise<void> { generation++; cancelProbe(); disposeFallback(); await cancelNative(); await pending.catch(() => undefined); await clearWorkspace(); },
};

export type VideoEngine = typeof videoEngine;
expose(videoEngine);
