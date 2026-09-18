import type { VideoSample } from "mediabunny";
import { LIMITS, type ColorLook, type MediaInfo, type VideoSettings } from "../types";
import { clamp, geometry } from "./shared";

type Context = OffscreenCanvasRenderingContext2D;
interface PixelExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  abi_version: () => number;
  alloc_rgba: (length: number) => number;
  free_rgba: (pointer: number, length: number) => void;
  process_rgba: (pointer: number, length: number, brightness: number, contrast: number, saturation: number, exposure: number, look: number) => number;
}
const LOOKS: Record<ColorLook, number> = { none: 0, warm: 1, cool: 2, mono: 3, cinema: 4 };
let compiledModule: Promise<WebAssembly.Module> | undefined;
function hasColor(settings: VideoSettings): boolean {
  return settings.brightness !== 0 || settings.contrast !== 1 || settings.saturation !== 1 || settings.exposure !== 0 || settings.look !== "none";
}

async function pixelKernel(): Promise<PixelExports> {
  if (typeof WebAssembly === "undefined") throw new Error("This browser does not support WebAssembly. Use a current browser for color adjustments.");
  if (!compiledModule) {
    compiledModule = (async () => {
      const response = await fetch("/tools/video-editor/pixel-ops.wasm", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Color engine asset is missing. Include public/tools/video-editor/pixel-ops.wasm in your deployment.");
      return WebAssembly.compile(await response.arrayBuffer());
    })().catch((error: unknown) => { compiledModule = undefined; throw error; });
  }
  const instance = await WebAssembly.instantiate(await compiledModule, {});
  const kernel = instance.exports as PixelExports;
  if (typeof kernel.abi_version !== "function" || kernel.abi_version() !== 1) throw new Error("The color engine version is incompatible. Refresh the app and include its matching pixel-ops.wasm asset.");
  return kernel;
}

/**
 * Sample the same Rust transform into an FFmpeg-compatible 33³ LUT. FFmpeg
 * interpolates this grid, so its result is close to, not bit-identical to,
 * the native per-pixel path. This also avoids divergent look formulas.
 */
export async function createColorLut(settings: VideoSettings): Promise<string | null> {
  if (!hasColor(settings)) return null;
  const size = 33, count = size ** 3, length = count * 4;
  const kernel = await pixelKernel();
  const pointer = kernel.alloc_rgba(length);
  if (!pointer) throw new Error("The color engine could not reserve its lookup table.");
  try {
    const grid = new Uint8Array(kernel.memory.buffer, pointer, length);
    let offset = 0;
    for (let blue = 0; blue < size; blue++) for (let green = 0; green < size; green++) for (let red = 0; red < size; red++) {
      grid[offset++] = Math.round(red * 255 / (size - 1));
      grid[offset++] = Math.round(green * 255 / (size - 1));
      grid[offset++] = Math.round(blue * 255 / (size - 1));
      grid[offset++] = 255;
    }
    if (kernel.process_rgba(pointer, length, settings.brightness, settings.contrast, settings.saturation, settings.exposure, LOOKS[settings.look] ?? 0) !== 0) throw new Error("The color engine could not create the lookup table.");
    const result = new Uint8Array(kernel.memory.buffer, pointer, length);
    const lines = ['TITLE "Game Asset Toolkit color adjustments"', `LUT_3D_SIZE ${size}`, "DOMAIN_MIN 0.0 0.0 0.0", "DOMAIN_MAX 1.0 1.0 1.0"];
    for (let index = 0; index < length; index += 4) lines.push(`${(result[index] / 255).toFixed(6)} ${(result[index + 1] / 255).toFixed(6)} ${(result[index + 2] / 255).toFixed(6)}`);
    return `${lines.join("\n")}\n`;
  } finally { kernel.free_rgba(pointer, length); }
}

function canvas(width: number, height: number, readFrequently = false): [OffscreenCanvas, Context] {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > LIMITS.pixels) throw new Error("Output dimensions exceed the video editor’s pixel limit.");
  if (typeof OffscreenCanvas === "undefined") throw new Error("This browser does not support offscreen video editing. Try a current version of Chrome, Edge, Firefox, or Safari.");
  const surface = new OffscreenCanvas(width, height);
  const context = surface.getContext("2d", { willReadFrequently: readFrequently, colorSpace: "srgb" });
  if (!context) throw new Error("The browser could not allocate a video rendering surface. Choose a smaller resolution.");
  return [surface, context];
}

function finite(value: number, fallback: number): number { return Number.isFinite(value) ? value : fallback; }

async function watermarkBitmap(file: File | null): Promise<ImageBitmap | null> {
  if (!file) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error("Choose a watermark smaller than 8 MB.");
  if (/svg/i.test(file.type) || /\.svgz?$/i.test(file.name)) throw new Error("Use a PNG, JPEG, WebP, or AVIF watermark. SVG files are not supported.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("This watermark could not be decoded. Use a PNG, JPEG, WebP, or AVIF image."); }
  if (bitmap.width * bitmap.height > 16_000_000 || bitmap.width < 1 || bitmap.height < 1) {
    bitmap.close(); throw new Error("Choose a watermark with fewer than 16 million pixels.");
  }
  return bitmap;
}

function wrapText(context: Context, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    let line = "";
    for (const character of paragraph) {
      if (line && context.measureText(line + character).width > maxWidth) { lines.push(line); line = character; }
      else line += character;
    }
    lines.push(line);
  }
  return lines;
}

function drawOverlay(context: Context, width: number, height: number, settings: VideoSettings, watermark: ImageBitmap | null): void {
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  if (watermark) {
    const naturalWidth = clamp(finite(settings.watermarkWidth, 0.18), 0.02, 1) * width;
    const scale = Math.min(naturalWidth / watermark.width, height / watermark.height);
    const w = watermark.width * scale, h = watermark.height * scale;
    const x = clamp(finite(settings.watermarkX, 0.85), 0, 1) * width;
    const y = clamp(finite(settings.watermarkY, 0.12), 0, 1) * height;
    context.globalAlpha = clamp(finite(settings.watermarkOpacity, 0.8), 0, 1);
    context.drawImage(watermark, clamp(x - w / 2, 0, width - w), clamp(y - h / 2, 0, height - h), w, h);
  }
  const text = settings.text.trim();
  if (text) {
    if (text.length > 2000) { context.restore(); throw new Error("Overlay text is limited to 2,000 characters."); }
    const family = settings.font === "serif" ? "serif" : settings.font === "monospace" ? "monospace" : "sans-serif";
    let fontSize = Math.max(2, height * clamp(finite(settings.fontSize, 5), 1, 30) / 100);
    const margin = Math.max(1, Math.min(width, height) * 0.025);
    context.font = `600 ${fontSize}px ${family}`;
    let lines = wrapText(context, text, width - margin * 2);
    // Reduce the text as a block if wrapping would extend beyond the frame.
    // Every character is retained; oversized text is never silently truncated.
    while (lines.length * fontSize * 1.25 > height - margin * 2 && fontSize > 2) {
      fontSize = Math.max(2, fontSize * 0.85);
      context.font = `600 ${fontSize}px ${family}`;
      lines = wrapText(context, text, width - margin * 2);
    }
    if (lines.length * fontSize * 1.25 > height - margin * 2) { context.restore(); throw new Error("This text does not fit the output frame. Use fewer characters or a larger resolution."); }
    const lineHeight = fontSize * 1.25;
    const blockHeight = lines.length * lineHeight;
    const textWidth = Math.max(...lines.map((line) => context.measureText(line).width));
    const x = clamp(finite(settings.textX, 0.5) * width, margin + textWidth / 2, width - margin - textWidth / 2);
    const y = clamp(finite(settings.textY, 0.85) * height, margin + blockHeight / 2, height - margin - blockHeight / 2);
    context.globalAlpha = clamp(finite(settings.textOpacity, 1), 0, 1);
    context.fillStyle = /^#[0-9a-f]{6}$/i.test(settings.textColor) ? settings.textColor : "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(0,0,0,.55)";
    context.shadowBlur = Math.max(1, fontSize * 0.12);
    context.shadowOffsetY = Math.max(0.5, fontSize * 0.04);
    lines.forEach((line, index) => context.fillText(line, x, y + (index - (lines.length - 1) / 2) * lineHeight));
  }
  context.restore();
}

/** Shared overlay bitmap for both the native and FFmpeg pipelines. No Wasm needed. */
export async function createOverlay(width: number, height: number, settings: VideoSettings, watermark: File | null): Promise<Blob | null> {
  if (!settings.text.trim() && !watermark) return null;
  const [surface, context] = canvas(width, height);
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await watermarkBitmap(watermark);
    drawOverlay(context, width, height, settings, bitmap);
    return await surface.convertToBlob({ type: "image/png" });
  } finally { bitmap?.close(); surface.width = 1; surface.height = 1; }
}

export interface FrameRenderer {
  render: (sample: VideoSample) => OffscreenCanvas;
  renderFromSource: (source: CanvasImageSource, width: number, height: number) => OffscreenCanvas;
  dispose: () => void;
}

/** Render one frame at a time; callers retain ownership of their input samples. */
export async function createFrameRenderer(info: MediaInfo, settings: VideoSettings, watermark: File | null): Promise<FrameRenderer> {
  const output = geometry(info, settings);
  const colored = hasColor(settings);
  const [surface, context] = canvas(output.width, output.height, colored);
  let kernel: PixelExports | null = null;
  let pointer = 0;
  const length = output.width * output.height * 4;
  let overlay: ImageBitmap | null = null;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (kernel && pointer) kernel.free_rgba(pointer, length);
    pointer = 0; kernel = null;
    overlay?.close(); overlay = null;
    surface.width = 1; surface.height = 1;
  };
  try {
    if (colored) {
      kernel = await pixelKernel();
      pointer = kernel.alloc_rgba(length);
      if (!pointer) throw new Error("Could not reserve color processing memory. Choose a smaller output resolution.");
    }
    const overlayBlob = await createOverlay(output.width, output.height, settings, watermark);
    if (overlayBlob) overlay = await createImageBitmap(overlayBlob);
  } catch (error) { dispose(); throw error; }

  const swapped = settings.rotate === 90 || settings.rotate === 270;
  const drawWidth = swapped ? output.height : output.width;
  const drawHeight = swapped ? output.width : output.height;
  const begin = () => {
    if (disposed) throw new Error("This frame renderer has already been disposed.");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.fillStyle = "#000000";
    context.fillRect(0, 0, output.width, output.height);
    context.save();
    context.translate(output.width / 2, output.height / 2);
    // Flips refer to horizontal/vertical axes of the final, rotated output.
    context.scale(settings.flipX ? -1 : 1, settings.flipY ? -1 : 1);
    context.rotate(settings.rotate * Math.PI / 180);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
  };
  const finish = () => {
    context.restore();
    if (kernel && pointer) {
      const pixels = context.getImageData(0, 0, output.width, output.height);
      // Re-read memory.buffer after allocation; Wasm growth invalidates old views.
      const bytes = new Uint8Array(kernel.memory.buffer, pointer, length);
      bytes.set(pixels.data);
      if (kernel.process_rgba(pointer, length, settings.brightness, settings.contrast, settings.saturation, settings.exposure, LOOKS[settings.look] ?? 0) !== 0) throw new Error("Color processing failed. Try a smaller output resolution.");
      pixels.data.set(new Uint8Array(kernel.memory.buffer, pointer, length));
      context.putImageData(pixels, 0, 0);
    }
    if (overlay) context.drawImage(overlay, 0, 0);
    return surface;
  };
  return {
    render(sample) {
      begin();
      try {
        const scaleX = sample.displayWidth / info.width, scaleY = sample.displayHeight / info.height;
        sample.draw(context, output.crop.x * scaleX, output.crop.y * scaleY, output.crop.width * scaleX, output.crop.height * scaleY, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      } catch (error) { context.restore(); throw error; }
      return finish();
    },
    renderFromSource(source, width, height) {
      begin();
      try {
        const scaleX = width / info.width, scaleY = height / info.height;
        context.drawImage(source, output.crop.x * scaleX, output.crop.y * scaleY, output.crop.width * scaleX, output.crop.height * scaleY, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      } catch (error) { context.restore(); throw error; }
      return finish();
    },
    dispose,
  };
}
