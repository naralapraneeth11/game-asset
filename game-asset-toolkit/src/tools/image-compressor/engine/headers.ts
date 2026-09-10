import type { Header } from "./core.js";
const ascii = (b: Uint8Array, p: number, n: number) => String.fromCharCode(...b.subarray(p, p + n));
const fail = () => { throw new Error("The image header is malformed or truncated."); };
function tiffOrientation(b: Uint8Array): number {
  if (b.length < 8) return 1;
  const le = ascii(b, 0, 2) === "II";
  if (!le && ascii(b, 0, 2) !== "MM") return 1;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (v.getUint16(2, le) !== 42) return 1;
  const at = v.getUint32(4, le);
  if (at > b.length - 2) fail();
  const count = v.getUint16(at, le);
  if (count > 4096 || at + 2 + count * 12 > b.length) fail();
  for (let i = 0; i < count; i++) {
    const p = at + 2 + 12 * i;
    if (v.getUint16(p, le) === 0x112 && v.getUint16(p + 2, le) === 3 && v.getUint32(p + 4, le) === 1) {
      const n = v.getUint16(p + 8, le); return n >= 1 && n <= 8 ? n : 1;
    }
  }
  return 1;
}
export function pngChunks(b: Uint8Array) {
  if (b.length < 33 || ascii(b, 1, 3) !== "PNG" || b[0] !== 137 || b[4] !== 13 || b[5] !== 10 || b[6] !== 26 || b[7] !== 10) fail();
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const chunks: { type: string; start: number; end: number; data: Uint8Array }[] = [];
  let p = 8;
  while (p < b.length && chunks.length < 100000) {
    if (p + 12 > b.length) fail();
    const len = v.getUint32(p), end = p + len + 12;
    if (end > b.length || end <= p) fail();
    const type = ascii(b, p + 4, 4);
    chunks.push({ type, start: p, end, data: b.subarray(p + 8, end - 4) }); p = end;
    if (type === "IEND") { if (len !== 0) fail(); return chunks; }
  }
  return fail();
}
/** Keep rendering semantics; remove personal/descriptive and unknown ancillary payloads. */
export function filterPng(b: Uint8Array, preserve: boolean): ArrayBuffer {
  const chunks = pngChunks(b);
  const allowed = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "cHRM", "gAMA", "iCCP", "sBIT", "sRGB", "cICP", "mDCV", "cLLI"]);
  const kept = chunks.filter(c => preserve || allowed.has(c.type));
  const out = new Uint8Array(8 + kept.reduce((n, c) => n + c.end - c.start, 0));
  out.set(b.subarray(0, 8)); let p = 8;
  for (const c of kept) { out.set(b.subarray(c.start, c.end), p); p += c.end - c.start; }
  return out.buffer;
}
export function inspect(b: Uint8Array): Header {
  if (b.length < 12) fail();
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const result: Header = { format: "png", width: 0, height: 0, bitDepth: 8, orientation: 1, animated: false, hdr: false };
  if (b[0] === 137 && ascii(b, 1, 3) === "PNG") {
    const chunks = pngChunks(b);
    if (chunks[0].type !== "IHDR" || chunks[0].data.length !== 13 || !chunks.some(c => c.type === "IDAT")) fail();
    result.width = v.getUint32(16); result.height = v.getUint32(20); result.bitDepth = b[24];
    result.animated = chunks.some(c => ["acTL", "fcTL", "fdAT"].includes(c.type));
    result.hdr = chunks.some(c => ["mDCV", "cLLI"].includes(c.type) || (c.type === "cICP" && [16, 18].includes(c.data[1])));
    const exif = chunks.find(c => c.type === "eXIf"); if (exif) result.orientation = tiffOrientation(exif.data);
    if (chunks.some(c => /^[A-Z]/.test(c.type) && !["IHDR", "PLTE", "IDAT", "IEND"].includes(c.type))) throw new Error("This PNG uses unsupported critical chunks.");
  } else if (b[0] === 255 && b[1] === 216) {
    result.format = "jpeg"; let p = 2, scans = 0;
    while (p < b.length && scans++ < 100000) {
      if (b[p++] !== 255) fail();
      while (p < b.length && b[p] === 255) p++;
      if (p >= b.length) fail(); const marker = b[p++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (p + 2 > b.length) fail(); const len = v.getUint16(p);
      if (len < 2 || p + len > b.length) fail();
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (len < 8) fail(); result.bitDepth = b[p + 2]; result.height = v.getUint16(p + 3); result.width = v.getUint16(p + 5);
      }
      if (marker === 225 && ascii(b, p + 2, 6) === "Exif\0\0") result.orientation = tiffOrientation(b.subarray(p + 8, p + len));
      if (marker >= 225 && marker <= 226) {
        const text = new TextDecoder("latin1").decode(b.subarray(p + 2, p + len));
        if (/hdrgm:|hdr-gain-map|21496|urn:iso:std:iso:ts:21496/i.test(text)) result.hdr = true;
      }
      p += len;
    }
  } else if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") {
    result.format = "webp"; const end = v.getUint32(4, true) + 8;
    if (end > b.length || end < 20) fail(); let p = 12;
    const u24 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
    while (p + 8 <= end) {
      const name = ascii(b, p, 4), len = v.getUint32(p + 4, true), d = p + 8;
      if (d + len > end) fail();
      if (name === "VP8X") { if (len < 10) fail(); result.width = 1 + u24(d + 4); result.height = 1 + u24(d + 7); result.animated ||= !!(b[d] & 2); }
      else if (name === "VP8 " && !result.width) { if (len < 10 || ascii(b, d + 3, 3) !== "\x9d\x01\x2a") fail(); result.width = v.getUint16(d + 6, true) & 0x3fff; result.height = v.getUint16(d + 8, true) & 0x3fff; }
      else if (name === "VP8L" && !result.width) { if (len < 5 || b[d] !== 47) fail(); const n = v.getUint32(d + 1, true); result.width = (n & 0x3fff) + 1; result.height = ((n >>> 14) & 0x3fff) + 1; }
      else if (["ANIM", "ANMF"].includes(name)) result.animated = true;
      else if (name === "EXIF") { const offset = ascii(b, d, 6) === "Exif\0\0" ? 6 : 0; result.orientation = tiffOrientation(b.subarray(d + offset, d + len)); }
      p = d + len + (len % 2);
    }
    if (p !== end) fail();
  } else if (ascii(b, 4, 4) === "ftyp") {
    const ftypLength = v.getUint32(0); if (ftypLength < 16 || ftypLength > b.length) fail();
    const brands = [ascii(b, 8, 4)]; for (let p = 16; p + 4 <= ftypLength; p += 4) brands.push(ascii(b, p, 4));
    if (!brands.some(s => s === "avif" || s === "avis")) throw new Error("HEIC/HEIF is not supported in this release. Export a still PNG or JPEG first.");
    result.format = "avif"; result.animated = brands.includes("avis"); let boxes = 0;
    function walk(start: number, end: number, depth: number) {
      if (depth > 12) fail(); let p = start;
      while (p < end) {
        if (++boxes > 10000 || p + 8 > end) fail();
        let size = v.getUint32(p), head = 8; const type = ascii(b, p + 4, 4);
        if (size === 1) { if (p + 16 > end || v.getUint32(p + 8) !== 0) fail(); size = v.getUint32(p + 12); head = 16; }
        if (size === 0) size = end - p;
        if (size < head || p + size > end) fail(); const d = p + head, stop = p + size;
        if (type === "ispe") { if (d + 12 > stop) fail(); const w = v.getUint32(d + 4), h = v.getUint32(d + 8); if (w * h > result.width * result.height) { result.width = w; result.height = h; } }
        else if (type === "pixi") { if (d + 5 > stop || d + 5 + b[d + 4] > stop) fail(); for (let i = 0; i < b[d + 4]; i++) result.bitDepth = Math.max(result.bitDepth, b[d + 5 + i]); }
        else if (type === "colr" && ascii(b, d, 4) === "nclx") { if (d + 11 > stop) fail(); if ([16, 18].includes(v.getUint16(d + 6))) result.hdr = true; }
        else if (type === "moov") result.animated = true;
        else if (type === "meta") walk(d + 4, stop, depth + 1);
        else if (["iprp", "ipco"].includes(type)) walk(d, stop, depth + 1);
        p = stop;
      }
    }
    walk(0, b.length, 0);
  } else throw new Error("Choose a still JPEG, PNG, WebP or AVIF. SVG, GIF, HEIC and other formats need their own conversion workflow.");
  if (!result.width || !result.height) fail();
  if (result.animated) throw new Error("Animated images are not compressed here, so no frames are silently discarded.");
  if (result.hdr) throw new Error("HDR indicators were detected. Use an HDR-aware editor to preserve this image.");
  return result;
}
