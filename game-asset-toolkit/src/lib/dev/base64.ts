/** RFC 4648 codecs. Keep binary values as bytes rather than UTF-16 text. */
export const BASE64_FILE_LIMIT = 16 * 1024 * 1024;
export const BASE64_TEXT_LIMIT = 2 * 1024 * 1024;
export const BASE64_PREVIEW_LIMIT = 64 * 1024;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array, urlSafe = false, padding = true): string {
  const alphabet = urlSafe ? ALPHABET.slice(0, 62) + '-_' : ALPHABET;
  const chunks: string[] = [];
  let chunk = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0;
    chunk += alphabet[a >>> 2] + alphabet[((a & 3) << 4) | (b >>> 4)];
    chunk += i + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >>> 6)] : padding ? '=' : '';
    chunk += i + 2 < bytes.length ? alphabet[c & 63] : padding ? '=' : '';
    if (chunk.length >= 32768) { chunks.push(chunk); chunk = ''; }
  }
  chunks.push(chunk);
  return chunks.join('');
}

export function decodeBase64(input: string, maxBytes = BASE64_FILE_LIMIT): { bytes: Uint8Array; mimeType: string; urlSafe: boolean } {
  if (input.length > Math.ceil(maxBytes / 3) * 4 + 1024 * 1024) throw new Error('The encoded input exceeds the supported size.');
  let value = input.trim();
  let mimeType = 'application/octet-stream';
  if (/^data:/i.test(value)) {
    const comma = value.indexOf(',');
    if (comma < 0 || comma > 1024) throw new Error('The Data URI is missing its comma separator or has an oversized header.');
    const header = value.slice(5, comma);
    if (!/;base64$/i.test(header)) throw new Error('This Data URI is not Base64 encoded. It must contain ;base64, before the content.');
    const declared = header.slice(0, -7).split(';')[0];
    if (declared && !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(declared)) throw new Error('The Data URI has an invalid media type.');
    mimeType = declared || 'text/plain';
    value = value.slice(comma + 1);
  }
  value = value.replace(/[\t\n\r ]/g, '');
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(value)) throw new Error('Base64 contains an invalid character or misplaced padding. Only spaces, tabs and line breaks are ignored.');
  if (/[-_]/.test(value) && /[+/]/.test(value)) throw new Error('The input mixes standard and URL-safe alphabets. Use one alphabet consistently.');
  const urlSafe = /[-_]/.test(value);
  const unpadded = value.replace(/=+$/, '');
  const remainder = unpadded.length % 4;
  if (remainder === 1) throw new Error('Base64 is incomplete: its unpadded length cannot leave a remainder of one.');
  const expectedPadding = remainder === 2 ? 2 : remainder === 3 ? 1 : 0;
  if (value.length !== unpadded.length && value.length - unpadded.length !== expectedPadding) throw new Error('Incorrect Base64 padding. Remove the ending = characters or provide the correct padding.');
  const normalized = unpadded.replace(/-/g, '+').replace(/_/g, '/');
  const last = ALPHABET.indexOf(normalized.slice(-1));
  if ((remainder === 2 && (last & 15) !== 0) || (remainder === 3 && (last & 3) !== 0)) throw new Error('The final Base64 character contains non-zero padding bits. The input is not a canonical encoding.');
  const length = Math.floor(normalized.length * 6 / 8);
  if (length > maxBytes) throw new Error('The decoded file exceeds the supported size.');
  const bytes = new Uint8Array(length);
  let accumulator = 0, bits = 0, cursor = 0;
  for (let i = 0; i < normalized.length; i++) {
    accumulator = (accumulator << 6) | ALPHABET.indexOf(normalized[i]);
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes[cursor++] = (accumulator >>> bits) & 255; }
  }
  return { bytes, mimeType, urlSafe };
}

/** Only raster signatures with bounded dimensions are eligible for an image preview. */
export function rasterInfo(bytes: Uint8Array): { mime: string; width: number; height: number; extension: string } | null {
  const n = bytes.length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, n);
  const ascii = (start: number, length: number) => Array.from(bytes.subarray(start, start + length), x => String.fromCharCode(x)).join('');
  let info: ReturnType<typeof rasterInfo> = null;
  if (n >= 24 && bytes[0] === 137 && ascii(1, 3) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10 && ascii(12, 4) === 'IHDR') {
    info = { mime: 'image/png', width: view.getUint32(16), height: view.getUint32(20), extension: 'png' };
  } else if (n >= 10 && /^(GIF87a|GIF89a)$/.test(ascii(0, 6))) {
    info = { mime: 'image/gif', width: view.getUint16(6, true), height: view.getUint16(8, true), extension: 'gif' };
  } else if (n >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const kind = ascii(12, 4);
    if (kind === 'VP8X') {
      info = { mime: 'image/webp', width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16), extension: 'webp' };
    } else if (kind === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      info = { mime: 'image/webp', width: view.getUint16(26, true) & 16383, height: view.getUint16(28, true) & 16383, extension: 'webp' };
    } else if (kind === 'VP8L' && bytes[20] === 47) {
      const packed = view.getUint32(21, true);
      info = { mime: 'image/webp', width: (packed & 16383) + 1, height: ((packed >>> 14) & 16383) + 1, extension: 'webp' };
    }
  } else if (n >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 < Math.min(n, 1024 * 1024)) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > n) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > n) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && length >= 8) {
        info = { mime: 'image/jpeg', height: view.getUint16(offset + 3), width: view.getUint16(offset + 5), extension: 'jpg' };
        break;
      }
      offset += length;
    }
  }
  return info && info.width > 0 && info.height > 0 ? info : null;
}
