import { SPRITE_LIMITS } from "./types";

export function makeCanvas(width: number, height: number): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  if (typeof OffscreenCanvas === "undefined") throw new Error("This browser does not support image processing in a worker. Use a current version of Chrome, Edge, Firefox, or Safari.");
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > SPRITE_LIMITS.canvasSide || height > SPRITE_LIMITS.canvasSide) throw new Error(`Image dimensions must be between 1 and ${SPRITE_LIMITS.canvasSide} pixels per side.`);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  if (!context) throw new Error("The browser could not allocate a canvas. Close other heavy tabs or use a smaller image.");
  context.imageSmoothingEnabled = false;
  return [canvas, context];
}

export async function png(canvas: OffscreenCanvas): Promise<Blob> {
  const blob = await canvas.convertToBlob({ type: "image/png" });
  if (!blob.size || blob.type !== "image/png") throw new Error("The browser could not encode this PNG. Try a smaller image.");
  return blob;
}

export async function thumbnail(source: CanvasImageSource, width: number, height: number, maxSide = 1024): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const [canvas, ctx] = makeCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  try { ctx.drawImage(source, 0, 0, canvas.width, canvas.height); return await png(canvas); }
  finally { canvas.width = canvas.height = 1; }
}

/** Inspect dimensions before decoding. Limit formats to bounded, recognizable raster headers. */
export async function readSheet(file: File): Promise<ImageBitmap> {
  if (!file.size || file.size > SPRITE_LIMITS.imageBytes) throw new Error("Choose a PNG, JPEG, or static WebP sheet up to 64 MiB.");
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer());
  const view = new DataView(bytes.buffer);
  const text = (at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));
  let width = 0, height = 0;
  if (bytes.length >= 24 && bytes[0] === 137 && text(1, 3) === "PNG" && view.getUint32(12) === 0x49484452) {
    width = view.getUint32(16); height = view.getUint32(20);
    for (let at = 8; at + 12 <= bytes.length;) {
      const length = view.getUint32(at), kind = text(at + 4, 4);
      if (kind === "acTL") throw new Error("Animated PNG sheets are not supported. Export a single static PNG frame first.");
      if (kind === "IDAT") break;
      at += length + 12;
    }
  } else if (bytes.length >= 30 && text(0, 4) === "RIFF" && text(8, 4) === "WEBP") {
    for (let at = 12; at + 8 <= bytes.length;) {
      const length = view.getUint32(at + 4, true), kind = text(at, 4), data = at + 8;
      if (data + Math.min(length, 10) > bytes.length) break;
      if (kind === "VP8X" && length >= 10) {
        if (bytes[data] & 2) throw new Error("Animated WebP sheets are not supported. Export a static PNG first.");
        width = 1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16);
        height = 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16);
        break;
      }
      if (kind === "VP8 " && length >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 1 && bytes[data + 5] === 0x2a) {
        width = view.getUint16(data + 6, true) & 0x3fff; height = view.getUint16(data + 8, true) & 0x3fff; break;
      }
      if (kind === "VP8L" && length >= 5 && bytes[data] === 0x2f) {
        const bits = view.getUint32(data + 1, true); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1; break;
      }
      at += 8 + length + (length & 1);
    }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    for (let at = 2; at + 4 < bytes.length;) {
      if (bytes[at++] !== 255) break;
      while (bytes[at] === 255) at++;
      const marker = bytes[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (at + 2 > bytes.length) break;
      const length = view.getUint16(at);
      if (length < 2) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && at + 7 <= bytes.length) {
        height = view.getUint16(at + 3); width = view.getUint16(at + 5); break;
      }
      at += length;
    }
  }
  if (!width || !height) throw new Error("The image header could not be read. Use a standard PNG, JPEG, or static WebP sheet.");
  if (width * height > SPRITE_LIMITS.imagePixels || width > SPRITE_LIMITS.canvasSide || height > SPRITE_LIMITS.canvasSide) throw new Error("This sheet is too large. Use at most 16 megapixels and 8192 pixels on either side.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > SPRITE_LIMITS.imagePixels || bitmap.width > SPRITE_LIMITS.canvasSide || bitmap.height > SPRITE_LIMITS.canvasSide) {
    bitmap.close(); throw new Error("The decoded image exceeds the image limit.");
  }
  return bitmap;
}
