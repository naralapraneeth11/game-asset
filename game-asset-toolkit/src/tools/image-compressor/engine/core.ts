export type Format = "jpeg" | "png" | "webp" | "avif" | "jxl";
export type Settings = {
  format: Format; quality: number; targetKB: number; minQuality: number;
  maxWidth: number; maxHeight: number; matte: string;
  effort: "fast" | "balanced" | "thorough"; preservePngMetadata: boolean;
};
export const DEFAULTS: Settings = {
  format: "webp", quality: 80, targetKB: 0, minQuality: 35,
  maxWidth: 0, maxHeight: 0, matte: "#ffffff", effort: "balanced", preservePngMetadata: false,
};
export const LIMITS = { file: 20_000_000, files: 100, batch: 200 * 1024 ** 2, output: 200 * 1024 ** 2, axis: 8000, pixels: 8_000_000, timeout: 120_000 };
export const MIME: Record<Format, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", jxl: "image/jxl" };
export const EXT: Record<Format, string> = { jpeg: "jpg", png: "png", webp: "webp", avif: "avif", jxl: "jxl" };
export type Header = { format: Exclude<Format, "jxl">; width: number; height: number; bitDepth: number; orientation: number; animated: boolean; hdr: boolean };
export type Result = {
  blob: Blob; preview: Blob; reference: Blob; width: number; height: number;
  inputWidth: number; inputHeight: number; quality: number | null;
  elapsed: number; targetMet: boolean; warnings: string[]; pixelPreserving: boolean;
};
export type WorkerRequest = { id: string; file: File; settings: Settings; maxPixels: number };
export type WorkerResponse = { id: string; type: "phase"; phase: string } | { id: string; type: "result"; result: Result } | { id: string; type: "error"; message: string };

export function validateSettings(value: Settings): Settings {
  if (!Object.hasOwn(MIME, value.format)) throw new Error("Choose a supported output format.");
  const integer = (n: number, low: number, high: number, name: string) => {
    if (!Number.isInteger(n) || n < low || n > high) throw new Error(`${name} must be a whole number from ${low} to ${high}.`);
  };
  integer(value.quality, 1, 100, "Quality"); integer(value.minQuality, 1, 100, "Minimum quality");
  integer(value.targetKB, 0, 20000, "Target size"); integer(value.maxWidth, 0, 8000, "Width"); integer(value.maxHeight, 0, 8000, "Height");
  if (!/^#[0-9a-f]{6}$/i.test(value.matte)) throw new Error("Enter a six-digit background color.");
  if (!["fast", "balanced", "thorough"].includes(value.effort)) throw new Error("Choose a valid effort.");
  if (value.targetKB && value.format === "png") throw new Error("Target size applies to lossy formats. PNG optimization preserves pixels.");
  return { ...value, preservePngMetadata: !!value.preservePngMetadata };
}
export function fit(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth > 0 ? maxWidth / width : 1, maxHeight > 0 ? maxHeight / height : 1);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
export function assertGeometry(width: number, height: number, maxPixels: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error("Invalid image dimensions.");
  if (width > LIMITS.axis || height > LIMITS.axis || width * height > maxPixels) {
    throw new Error(`Image is ${width} × ${height}. This session supports up to ${Math.round(maxPixels / 1e6)} MP and 8000 px per side. Resize it first.`);
  }
}
export function bytes(n: number) { return n < 1000 ? `${n} B` : n < 1e6 ? `${(n / 1000).toFixed(1)} KB` : `${(n / 1e6).toFixed(2)} MB`; }
export function savings(before: number, after: number) { return before > 0 ? (1 - after / before) * 100 : 0; }
export function safePath(path: string, format: Format, used: Set<string>): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(p => p && p !== "." && p !== "..");
  const clean = parts.slice(-12).map(p => p.replace(/[\x00-\x1f\x7f<>:"|?*\\/]/g, "_").replace(/[. ]+$/g, "").slice(0, 100) || "image");
  const last = clean.pop() || "image";
  let stem = last.replace(/\.[^.]*$/, "") || "image";
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(stem)) stem = `_${stem}`;
  const folder = clean.map(p => /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(p) ? `_${p}` : p).join("/");
  let count = 1, result: string;
  do { result = `${folder ? folder + "/" : ""}${stem}${count === 1 ? "" : `-${count}`}.${EXT[format]}`; count++; } while (used.has(result.toLowerCase()));
  used.add(result.toLowerCase()); return result;
}
/** A bounded search over measured candidates. No monotonicity or exact-size guarantee. */
export async function searchQuality(encode: (quality: number) => Promise<ArrayBuffer>, target: number, floor: number, report: (n: number) => void) {
  let best: { buffer: ArrayBuffer; quality: number } | undefined;
  let smallest: { buffer: ArrayBuffer; quality: number } | undefined;
  const tried = new Set<number>();
  let count = 0;
  async function run(q: number) {
    tried.add(q); report(++count);
    const buffer = await encode(q), candidate = { buffer, quality: q };
    if (!smallest || buffer.byteLength < smallest.buffer.byteLength) smallest = candidate;
    if (buffer.byteLength <= target && (!best || q > best.quality)) best = candidate;
    return buffer.byteLength <= target;
  }
  const topFits = await run(100);
  if (topFits) return { ...best!, targetMet: true };
  if (floor < 100) await run(floor);
  let lo = floor, hi = 99;
  while (count < 8 && lo <= hi) {
    const q = Math.floor((lo + hi) / 2);
    if (tried.has(q)) { lo = q + 1; continue; }
    if (await run(q)) lo = q + 1; else hi = q - 1;
  }
  const chosen = best || smallest!;
  return { ...chosen, targetMet: !!best };
}
