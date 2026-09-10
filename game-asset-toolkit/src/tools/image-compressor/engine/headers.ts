import type { Header } from "./core.js";
const ascii = (b: Uint8Array, p: number, n: number) => String.fromCharCode(...b.subarray(p, p + n));
const fail = () => { throw new Error("The image header is malformed or truncated."); };
function tiffOrientation(b: Uint8Array): number {
  if (b.length < 8) return 1;
  const le = ascii(b, 0, 2) === "II";
  const u16 = (p: number) => le ? b[p] | (b[p + 1] << 8) : (b[p] << 8) | b[p + 1];
  const u32 = (p: number) => le ? b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24) : (b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3];
  if (u16(2) !== 42) return 1;
  let offset = u32(4);
  if (offset + 2 > b.length) return 1;
  const count = u16(offset); offset += 2;
  for (let i = 0; i < count; i++, offset += 12) {
    if (offset + 12 > b.length) break;
    if (u16(offset) === 274 && u16(offset + 2) === 3 && u32(offset + 4) === 1) return u16(offset + 8) || 1;
  }
  return 1;
}
export function inspect(bytes: Uint8Array): Header {
  if (bytes.length < 12) fail();
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    let orientation = 1, i = 2;
    while (i + 4 < bytes.length && bytes[i] === 0xFF) {
      const marker = bytes[i + 1];
      if (marker === 0xD9 || marker === 0xDA) break;
      const size = (bytes[i + 2] << 8) | bytes[i + 3];
      if (size < 2 || i + 2 + size > bytes.length) break;
      if (marker === 0xE1 && size >= 8 && ascii(bytes, i + 4, 4) === "Exif") orientation = tiffOrientation(bytes.subarray(i + 10, i + 2 + size));
      i += 2 + size;
    }
    return { format: "jpeg", width: 0, height: 0, orientation, hasAlpha: false };
  }
  if (ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n") {
    let width = 0, height = 0, bitDepth = 8, colorType = 2, i = 8;
    while (i + 12 <= bytes.length) {
      const len = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
      const type = ascii(bytes, i + 4, 4);
      if (i + 12 + len > bytes.length) fail();
      if (type === "IHDR" && len >= 13) {
        width = (bytes[i + 8] << 24) | (bytes[i + 9] << 16) | (bytes[i + 10] << 8) | bytes[i + 11];
        height = (bytes[i + 12] << 24) | (bytes[i + 13] << 16) | (bytes[i + 14] << 8) | bytes[i + 15];
        bitDepth = bytes[i + 16]; colorType = bytes[i + 17];
      }
      if (type === "IEND") break;
      i += 12 + len;
    }
    if (!width || !height) fail();
    return { format: "png", width, height, orientation: 1, hasAlpha: (colorType & 4) !== 0 || colorType === 3 };
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    const kind = ascii(bytes, 12, 4);
    let width = 0, height = 0, hasAlpha = false;
    if (kind === "VP8 " && bytes.length >= 30) {
      width = ((bytes[26] | (bytes[27] << 8)) & 0x3fff);
      height = ((bytes[28] | (bytes[29] << 8)) & 0x3fff);
    } else if (kind === "VP8L" && bytes.length >= 25) {
      const b = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      width = (b & 0x3fff) + 1; height = ((b >> 14) & 0x3fff) + 1; hasAlpha = !!(b & (1 << 28));
    } else if (kind === "VP8X" && bytes.length >= 30) {
      hasAlpha = !!(bytes[20] & 0x10);
      width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    } else fail();
    return { format: "webp", width, height, orientation: 1, hasAlpha };
  }
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    // ISO BMFF (AVIF/HEIC-like). Dimensions require a fuller parse; return format only for budget checks.
    return { format: "avif", width: 0, height: 0, orientation: 1, hasAlpha: true };
  }
  throw new Error("Unsupported or unrecognized image format.");
}
export function filterPng(bytes: Uint8Array, preserveMetadata: boolean): Uint8Array {
  if (ascii(bytes, 0, 8) !== "\x89PNG\r\n\x1a\n") return bytes;
  const keep = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS"]);
  if (preserveMetadata) ["tEXt", "zTXt", "iTXt", "tIME", "pHYs", "sRGB", "gAMA", "cHRM", "iCCP"].forEach(t => keep.add(t));
  const out: number[] = [...bytes.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= bytes.length) {
    const len = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
    const type = ascii(bytes, i + 4, 4);
    const end = i + 12 + len;
    if (end > bytes.length) break;
    if (keep.has(type)) out.push(...bytes.subarray(i, end));
    i = end;
  }
  return new Uint8Array(out);
}
export function pngChunks(bytes: Uint8Array): { type: string; data: Uint8Array }[] {
  const chunks: { type: string; data: Uint8Array }[] = [];
  if (ascii(bytes, 0, 8) !== "\x89PNG\r\n\x1a\n") return chunks;
  let i = 8;
  while (i + 12 <= bytes.length) {
    const len = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
    const type = ascii(bytes, i + 4, 4);
    if (i + 12 + len > bytes.length) break;
    chunks.push({ type, data: bytes.subarray(i + 8, i + 8 + len) });
    i += 12 + len;
  }
  return chunks;
}
