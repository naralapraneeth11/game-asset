/// <reference lib="webworker" />
import { cleanStem, LIMITS, type ScaleOutput, type SourceInfo, type WorkerReply, type WorkerRequest, type ScaleSettings } from "./types";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const reply = (message: WorkerReply) => scope.postMessage(message);
const fail = (message: string): never => { throw new Error(message); };

/** Inspect dimensions before asking the browser to allocate decoded pixels. */
async function inspect(file: File): Promise<SourceInfo> {
  if (!file.size) fail("This file is empty.");
  if (file.size > LIMITS.fileBytes) fail("Choose an image smaller than 32 MB.");
  const bytes = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer());
  const view = new DataView(bytes.buffer);
  const text = (at: number, size: number) => String.fromCharCode(...bytes.subarray(at, at + size));
  let width = 0, height = 0, format = "";
  if (bytes.length >= 24 && bytes[0] === 137 && text(1, 3) === "PNG" && text(12, 4) === "IHDR") {
    width = view.getUint32(16); height = view.getUint32(20); format = "PNG";
    // acTL precedes IDAT in a conforming APNG. Do not quietly discard animation.
    let foundImage = false;
    for (let at = 8; at + 12 <= bytes.length;) {
      const size = view.getUint32(at), kind = text(at + 4, 4);
      if (kind === "acTL") fail("Animated PNG is not supported here. Use a static frame or the sprite tools.");
      if (kind === "IDAT") { foundImage = true; break; }
      if (size > bytes.length - at - 12) break;
      at += size + 12;
    }
    if (!foundImage) fail("PNG metadata exceeds the safe header limit or the file is incomplete. Re-save it as a standard PNG.");
  } else if (bytes.length >= 30 && text(0, 4) === "RIFF" && text(8, 4) === "WEBP") {
    format = "WebP";
    const chunk = text(12, 4);
    if (chunk === "VP8X") {
      if (bytes[20] & 2) fail("Animated WebP is not supported here. Use a static frame or the sprite tools.");
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === "VP8 ") {
      if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) fail("This WebP header is not supported.");
      width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff;
    } else if (chunk === "VP8L" && bytes[20] === 0x2f) {
      width = 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]);
      height = 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | (bytes[22] >> 6));
    }
  } else if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    format = "JPEG";
    let at = 2;
    while (at + 4 <= bytes.length) {
      if (bytes[at++] !== 0xff) break;
      while (at < bytes.length && bytes[at] === 0xff) at++;
      const marker = bytes[at++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (at + 2 > bytes.length) break;
      const size = view.getUint16(at);
      if (size < 2 || at + size > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 8) {
        height = view.getUint16(at + 3); width = view.getUint16(at + 5); break;
      }
      at += size;
    }
  }
  if (!width || !height || !format) fail("Choose a valid static PNG, JPEG or WebP image. SVG, GIF and unusually large image headers are not supported.");
  if (width * height > LIMITS.sourcePixels || Math.max(width, height) > LIMITS.edge) fail("Source images must be at most 16 megapixels and 8,192 pixels on either side.");
  return { width, height, format };
}

function sizes(width: number, height: number, settings: ScaleSettings) {
  if (!["pixel", "density"].includes(settings.mode) || !["nearest", "smooth"].includes(settings.sampling)) fail("Invalid scale settings.");
  if (settings.mode === "pixel") {
    if (!Number.isInteger(settings.factor) || settings.factor < 1 || settings.factor > 16) fail("Choose a whole-number scale between 1× and 16×.");
    return [{ width: width * settings.factor, height: height * settings.factor, factor: settings.factor, density: undefined as number | undefined }];
  }
  if (![1, 2, 3].includes(settings.inputDensity)) fail("Choose a source density of 1×, 2× or 3×.");
  if (width % settings.inputDensity || height % settings.inputDensity) fail(`Both source dimensions must divide evenly by ${settings.inputDensity} for accurate @1x, @2x and @3x files. Choose a different source density or adjust the source dimensions.`);
  return [1, 2, 3].map(density => ({ width: width / settings.inputDensity * density, height: height / settings.inputDensity * density, factor: undefined, density }));
}

async function scale(request: Extract<WorkerRequest, { kind: "scale" }>) {
  const { id, file, settings } = request;
  const update = (progress: number, phase: string) => reply({ id, kind: "progress", progress, phase });
  update(0.02, "Reading image header");
  const header = await inspect(file);
  const provisional = sizes(header.width, header.height, settings);
  for (const size of provisional) {
    if (size.width * size.height > LIMITS.outputPixels || Math.max(size.width, size.height) > LIMITS.edge) fail("This scale exceeds 16 megapixels or 8,192 pixels on an edge. Choose a smaller factor or higher source density.");
    if ((header.width * header.height + size.width * size.height) * 12 > LIMITS.operationMemory) fail("This image and scale need too much working memory. Choose a smaller source or scale factor.");
  }
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") fail("This browser cannot resize images in a background worker. Use a current browser with OffscreenCanvas support.");
  update(0.08, "Decoding image");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image", premultiplyAlpha: "none", colorSpaceConversion: "none" });
  let canvas: OffscreenCanvas | undefined;
  const outputs: ScaleOutput[] = [];
  try {
    const source = { width: bitmap.width, height: bitmap.height, format: header.format };
    const targets = sizes(source.width, source.height, settings);
    let retained = 0;
    for (let index = 0; index < targets.length; index++) {
      const size = targets[index];
      canvas = new OffscreenCanvas(size.width, size.height);
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) fail("The browser could not allocate an image canvas. Try a smaller image.");
      context.imageSmoothingEnabled = settings.mode === "density" && settings.sampling === "smooth";
      context.imageSmoothingQuality = "high";
      update(0.15 + index / targets.length * 0.8, `Rendering ${size.density ? `@${size.density}x` : `${size.factor}×`} PNG`);
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      if (!blob.size || blob.type !== "image/png") fail("PNG export failed. Try a smaller image.");
      retained += blob.size;
      if (retained > LIMITS.retainedBytes) fail("This set exceeds the 96 MB output budget. Choose smaller images.");
      const suffix = size.density ? `@${size.density}x` : `_${size.factor}x`;
      outputs.push({ ...size, name: `${cleanStem(file.name)}${suffix}.png`, blob });
      canvas.width = canvas.height = 1;
      canvas = undefined;
    }
    reply({ id, kind: "result", result: { source, outputs, settings } });
  } finally { bitmap.close(); if (canvas) canvas.width = canvas.height = 1; }
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try { await scale(request); }
  catch (error) { reply({ id: request.id, kind: "error", message: error instanceof Error ? error.message : "Image processing failed. Try a smaller image." }); }
};
