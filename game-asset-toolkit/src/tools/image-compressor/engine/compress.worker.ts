import { assertGeometry, outputGeometry, LIMITS, MIME, searchQuality, validateSettings } from "./core.js";
import type { Result, WorkerRequest, WorkerResponse } from "./core.js";
import { filterPng, inspect } from "./headers.js";

// The preparation script publishes this module and pinned codecs under one versioned path.
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};
const codec = (name: string, operation = "encode") => import(`./codecs/${name}/${operation}.js`);
let busy = false;
scope.onmessage = async ({ data: request }) => {
  if (busy) return;
  busy = true;
  const { id, file } = request;
  const phase = (phase: string) => scope.postMessage({ id, type: "phase", phase });
  let bitmap: ImageBitmap | undefined, canvas: OffscreenCanvas | undefined;
  const started = performance.now();
  try {
    const settings = validateSettings(request.settings);
    if (!(file instanceof Blob) || file.size < 12 || file.size > LIMITS.file) throw new Error("Each image must be between 12 bytes and 20 MB.");
    const maxPixels = Math.min(16_000_000, Math.max(1, request.maxPixels || LIMITS.pixels));
    phase("Checking image");
    const input = await file.arrayBuffer(), header = inspect(new Uint8Array(input));
    const oriented = header.orientation >= 5 ? { width: header.height, height: header.width } : header;
    let size = outputGeometry(oriented.width, oriented.height, settings, maxPixels);
    const originalPng = header.format === "png" && settings.format === "png" && header.orientation === 1 && size.width === header.width && size.height === header.height;
    if (settings.preservePngMetadata && !originalPng) throw new Error("Metadata preservation requires PNG to PNG with original dimensions and orientation. Disable it for conversion or resizing.");
    if (header.bitDepth > 8 && !originalPng) throw new Error("This image exceeds 8 bits per channel. Use original-size PNG optimization or a high-bit-depth editor.");
    let buffer: ArrayBuffer, selectedQuality: number | null = settings.quality, targetMet = true;
    const warnings: string[] = [];
    phase("Loading encoder");
    if (originalPng) {
      const { default: optimise } = await codec("oxipng", "optimise");
      const safe = filterPng(new Uint8Array(input), settings.preservePngMetadata);
      phase("Optimizing PNG pixels");
      const optimized: ArrayBuffer = await optimise(safe, { level: settings.effort === "fast" ? 1 : settings.effort === "thorough" ? 4 : 2, optimiseAlpha: false, interlace: false });
      const filtered = filterPng(new Uint8Array(optimized), settings.preservePngMetadata);
      buffer = filtered.byteLength < safe.byteLength ? filtered : safe;
      selectedQuality = null;
      if (settings.preservePngMetadata) warnings.push("Original PNG metadata retained; it may contain personal information.");
    } else {
      if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") throw new Error("This browser needs worker image decoding and OffscreenCanvas. Try a current Chrome, Firefox, Edge or Safari.");
      phase("Decoding image");
      bitmap = await createImageBitmap(new Blob([input], { type: MIME[header.format] }), { imageOrientation: "from-image", colorSpaceConversion: "default" });
      size = outputGeometry(bitmap.width, bitmap.height, settings, maxPixels);
      canvas = new OffscreenCanvas(size.width, size.height);
      const ctx = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
      if (!ctx) throw new Error("A 2D image canvas could not be created.");
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      if (settings.format === "jpeg") { ctx.fillStyle = settings.matte; ctx.fillRect(0, 0, size.width, size.height); warnings.push(`JPEG uses ${settings.matte} behind transparent areas.`); }
      ctx.drawImage(bitmap, 0, 0, size.width, size.height); bitmap.close(); bitmap = undefined;
      const pixels = ctx.getImageData(0, 0, size.width, size.height);
      canvas.width = 1; canvas.height = 1; canvas = undefined;
      warnings.push("Converted to 8-bit sRGB; descriptive metadata removed.");
      if (header.width !== size.width || header.height !== size.height) warnings.push(`Output dimensions: ${size.width} × ${size.height}.`);
      if (settings.format === "png") {
        const { default: optimise } = await codec("oxipng", "optimise");
        phase("Encoding PNG");
        buffer = await optimise(pixels, { level: settings.effort === "fast" ? 1 : settings.effort === "thorough" ? 4 : 2, optimiseAlpha: false });
        buffer = filterPng(new Uint8Array(buffer), false); selectedQuality = null;
        warnings.push("PNG preserves the normalized pixels, not the original file's color precision or hidden RGB.");
      } else {
        const { default: encode } = await codec(settings.format);
        const encodeAt = (quality: number): Promise<ArrayBuffer> => {
          if (settings.format === "jpeg") return encode(pixels, { quality, progressive: true, optimize_coding: true });
          if (settings.format === "webp") return encode(pixels, { quality, method: settings.effort === "fast" ? 2 : settings.effort === "thorough" ? 6 : 4, alpha_quality: 100, exact: 1 });
          if (settings.format === "avif") return encode(pixels, { quality, qualityAlpha: 100, speed: settings.effort === "fast" ? 8 : settings.effort === "thorough" ? 4 : 6, subsample: 3 });
          return encode(pixels, { quality, effort: 7 });
        };
        if (settings.targetKB) {
          const found = await searchQuality(encodeAt, settings.targetKB * 1000, settings.minQuality, n => phase(`Finding target size · candidate ${n} of up to 8`));
          buffer = found.buffer; selectedQuality = found.quality; targetMet = found.targetMet;
          if (!targetMet) warnings.push("Target not reached within the quality floor and search budget. Try smaller dimensions or a lower minimum quality.");
        } else { phase("Compressing image"); buffer = await encodeAt(settings.quality); }
      }
    }
    if (!buffer.byteLength || buffer.byteLength > LIMITS.output) throw new Error("The encoded result is empty or exceeds this session's output budget.");
    const blob = new Blob([buffer], { type: MIME[settings.format] });
    phase("Checking result");
    let preview = blob;
    if (settings.format === "jxl") {
      const { default: decode } = await codec("jxl", "decode");
      const decoded: ImageData = await decode(buffer);
      assertGeometry(decoded.width, decoded.height, maxPixels);
      if (decoded.width !== size.width || decoded.height !== size.height) throw new Error("Encoder returned unexpected dimensions.");
      canvas = new OffscreenCanvas(decoded.width, decoded.height);
      const context = canvas.getContext("2d"); if (!context) throw new Error("Cannot create the JPEG XL preview.");
      context.putImageData(decoded, 0, 0); preview = await canvas.convertToBlob({ type: "image/png" });
      canvas.width = 1; canvas.height = 1; canvas = undefined;
      warnings.push("Experimental JPEG XL output. The preview is a decoded PNG; the download remains .jxl.");
    } else {
      const outputHeader = inspect(new Uint8Array(buffer));
      if (outputHeader.format !== settings.format || outputHeader.width !== size.width || outputHeader.height !== size.height) throw new Error("Encoder returned an unexpected format or size.");
    }
    if (buffer.byteLength >= file.size) warnings.push("This result is not smaller. The requested format and metadata policy were still applied.");
    const result: Result = { blob, preview, reference: file, width: size.width, height: size.height, inputWidth: header.width, inputHeight: header.height, quality: selectedQuality, elapsed: performance.now() - started, warnings, targetMet, pixelPreserving: originalPng };
    scope.postMessage({ id, type: "result", result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image processing failed.";
    scope.postMessage({ id, type: "error", message: /fetch|import|wasm|compile/i.test(message) ? `${message} Check that the self-hosted codec assets are present; reconnect if they have not been cached.` : message });
  } finally { bitmap?.close(); if (canvas) { canvas.width = 1; canvas.height = 1; } busy = false; }
};


// A startup handshake distinguishes loading failures from failures after a job begins.
scope.postMessage({ type: "ready", version: "v2" });
