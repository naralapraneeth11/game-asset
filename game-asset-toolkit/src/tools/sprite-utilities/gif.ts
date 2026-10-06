import { decompressFrame, parseGIF } from "gifuct-js";
import { makeCanvas, png, thumbnail } from "./canvas";
import { baseName, integer } from "./geometry";
import { SPRITE_LIMITS, type GifOptions, type ProgressHandler, type SpriteInfo, type SpriteOutput, type SpriteResult } from "./types";

type GifFrame = Parameters<typeof decompressFrame>[0];
type GifData = ReturnType<typeof parseGIF>;

function delay(frame: GifFrame): number {
  // Preserve non-zero encoded timing. Missing/zero delay gets a documented 100 ms fallback.
  return frame.gce?.delay ? frame.gce.delay * 10 : 100;
}

/** Bound frame tables and decode work before the general GIF parser allocates objects. */
function preflight(bytes: Uint8Array, width: number, height: number): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 13 + ((bytes[10] & 128) ? 3 * (1 << ((bytes[10] & 7) + 1)) : 0);
  let count = 0, pixels = 0;
  const blocks = () => {
    while (true) {
      if (at >= bytes.length) throw new Error("This GIF ends inside a data block. Choose the complete original file.");
      const size = bytes[at++];
      if (!size) break;
      at += size;
      if (at > bytes.length) throw new Error("This GIF contains a truncated data block.");
    }
  };
  while (at < bytes.length) {
    const marker = bytes[at++];
    if (marker === 0x3b) return;
    if (marker === 0x21) {
      if (at >= bytes.length) break;
      const label = bytes[at++];
      if (label === 0x01) throw new Error("GIF plain-text rendering blocks are not supported. Re-export the GIF as image frames first.");
      blocks();
    } else if (marker === 0x2c) {
      if (at + 9 > bytes.length) break;
      const left = view.getUint16(at, true), top = view.getUint16(at + 2, true);
      const frameWidth = view.getUint16(at + 4, true), frameHeight = view.getUint16(at + 6, true), flags = bytes[at + 8];
      if (!frameWidth || !frameHeight || left + frameWidth > width || top + frameHeight > height) throw new Error("This GIF contains an invalid frame rectangle.");
      pixels += frameWidth * frameHeight;
      if (++count > SPRITE_LIMITS.inputFrames) throw new Error("This GIF has more than 5000 source frames. Trim it before importing.");
      if (pixels > SPRITE_LIMITS.decodePixels) throw new Error("This animation is too expensive to decode safely in the browser. Shorten or resize the GIF first.");
      at += 9 + ((flags & 128) ? 3 * (1 << ((flags & 7) + 1)) : 0);
      if (at >= bytes.length || bytes[at] < 2 || bytes[at] > 8) throw new Error("The GIF has an invalid LZW code size.");
      at++;
      blocks();
    } else {
      throw new Error("This GIF contains an unrecognized or damaged block. Re-export it as a standard GIF.");
    }
  }
  throw new Error("This GIF is missing its final trailer. Choose the complete original file.");
}

async function readGif(file: File): Promise<{ gif: GifData; frames: GifFrame[]; warnings: string[] }> {
  if (!file.size || file.size > SPRITE_LIMITS.gifBytes) throw new Error("Choose a GIF up to 32 MiB.");
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const header = String.fromCharCode(...bytes.subarray(0, 6));
  if (header !== "GIF87a" && header !== "GIF89a") throw new Error("This file is not a GIF. Choose a .gif file, not a renamed video or image.");
  const view = new DataView(buffer);
  if (bytes.length < 13) throw new Error("This GIF is incomplete.");
  const width = view.getUint16(6, true), height = view.getUint16(8, true);
  if (!width || !height || width * height > SPRITE_LIMITS.gifPixels || width > SPRITE_LIMITS.canvasSide || height > SPRITE_LIMITS.canvasSide) throw new Error("Use a GIF up to 4 megapixels and 8192 pixels on either side.");
  preflight(bytes, width, height);
  const gif = parseGIF(buffer);
  const frames = gif.frames.filter((frame): frame is GifFrame => "image" in frame);
  if (!frames.length) throw new Error("This GIF contains no image frames.");
  if (frames.length > SPRITE_LIMITS.inputFrames) throw new Error("This GIF has more than 5000 source frames. Trim it before importing.");
  let pixels = 0;
  for (const frame of frames) {
    const rect = frame.image.descriptor;
    if (!rect.width || !rect.height || rect.width * rect.height > SPRITE_LIMITS.gifPixels || rect.left + rect.width > width || rect.top + rect.height > height) throw new Error("This GIF contains an invalid or oversized frame rectangle.");
    if (frame.gce?.extras.disposal && frame.gce.extras.disposal > 3) throw new Error("This GIF uses an undefined disposal method. Re-export it as a standard GIF first.");
    pixels += rect.width * rect.height;
  }
  if (pixels > SPRITE_LIMITS.decodePixels) throw new Error("This animation is too expensive to decode safely in the browser. Shorten or resize the GIF first.");
  const warnings: string[] = [];
  if (frames.some(frame => !frame.gce?.delay)) warnings.push("Frames with a missing or zero delay use 100 ms. All other encoded delays are preserved, including very short delays browsers may clamp during playback.");
  if (gif.frames.some(frame => "text" in frame)) throw new Error("GIF plain-text rendering blocks are not supported. Re-export the GIF as image frames first.");
  return { gif, frames, warnings };
}

function gifBackground(gif: GifData): string | null {
  const color = gif.gct?.[gif.lsd.backgroundColorIndex];
  return color ? `rgb(${color[0]}, ${color[1]}, ${color[2]})` : null;
}

function loopCount(gif: GifData): number | null {
  for (const frame of gif.frames) {
    if (!("application" in frame)) continue;
    const application = frame.application;
    if ((application.id.startsWith("NETSCAPE") || application.id.startsWith("ANIMEXTS")) && application.blocks?.length >= 3 && application.blocks[0] === 1) return application.blocks[1] | (application.blocks[2] << 8);
  }
  return null;
}

function painter(gif: GifData, background: string | null) {
  const [canvas, context] = makeCanvas(gif.lsd.width, gif.lsd.height);
  const [patchCanvas, patchContext] = makeCanvas(1, 1);
  let previous: { left: number; top: number; width: number; height: number; disposal: number } | null = null;
  let restore: ImageData | null = null;
  if (background) { context.fillStyle = background; context.fillRect(0, 0, canvas.width, canvas.height); }
  return {
    canvas,
    draw(raw: GifFrame) {
      // Dispose the previous image before painting the next. Transparent patch pixels
      // are composited with drawImage, never putImageData onto the accumulated canvas.
      if (previous?.disposal === 2) {
        context.clearRect(previous.left, previous.top, previous.width, previous.height);
        if (background) { context.fillStyle = background; context.fillRect(previous.left, previous.top, previous.width, previous.height); }
      } else if (previous?.disposal === 3 && restore) {
        context.putImageData(restore, previous.left, previous.top);
      }
      restore = null;
      const frame = decompressFrame(raw, gif.gct, true);
      const { left, top, width, height } = frame.dims;
      if (frame.disposalType === 3) restore = context.getImageData(left, top, width, height);
      patchCanvas.width = width; patchCanvas.height = height;
      patchContext.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), width, height), 0, 0);
      context.drawImage(patchCanvas, left, top);
      previous = { left, top, width, height, disposal: frame.disposalType || 0 };
    },
    dispose() { restore = null; canvas.width = canvas.height = patchCanvas.width = patchCanvas.height = 1; },
  };
}

export async function inspectGif(file: File): Promise<SpriteInfo> {
  const { gif, frames, warnings } = await readGif(file);
  const paint = painter(gif, null);
  try {
    paint.draw(frames[0]);
    return { width: gif.lsd.width, height: gif.lsd.height, frameCount: frames.length, durationMs: frames.reduce((sum, frame) => sum + delay(frame), 0), background: gifBackground(gif), preview: await thumbnail(paint.canvas, gif.lsd.width, gif.lsd.height), warnings };
  } finally { paint.dispose(); }
}

export async function gifToSheet(file: File, options: GifOptions, progress: ProgressHandler): Promise<SpriteResult> {
  progress({ value: 0, label: "Reading animation" });
  const { gif, frames, warnings } = await readGif(file);
  const start = integer(options.start, "First frame", 1, frames.length) - 1;
  const end = options.end ? integer(options.end, "Last frame", 1, frames.length) : frames.length;
  if (end <= start) throw new Error("The last frame must be at or after the first frame.");
  const stride = integer(options.stride, "Frame interval", 1, SPRITE_LIMITS.inputFrames);
  const maximum = integer(options.maxFrames, "Frame limit", 1, SPRITE_LIMITS.gifFrames);
  const count = Math.ceil((end - start) / stride);
  if (count > maximum) throw new Error(`This range produces ${count} sprites, above the ${maximum} frame limit. Increase the frame interval or shorten the range.`);
  if (!Number.isFinite(options.scale) || options.scale < 0.1 || options.scale > 4) throw new Error("Scale must be between 0.1× and 4×.");
  const width = Math.max(1, Math.round(gif.lsd.width * options.scale));
  const height = Math.max(1, Math.round(gif.lsd.height * options.scale));
  const padding = integer(options.padding, "Padding", 0, 64);
  const cellWidth = width + padding * 2, cellHeight = height + padding * 2;
  const requestedColumns = integer(options.columns, "Columns", 0, SPRITE_LIMITS.gifFrames);
  const columns = requestedColumns ? Math.min(count, requestedColumns) : Math.min(count, Math.max(1, Math.round(Math.sqrt(count * cellHeight / cellWidth))));
  const rows = Math.ceil(count / columns);
  const atlasWidth = columns * cellWidth, atlasHeight = rows * cellHeight;
  if (atlasWidth * atlasHeight > SPRITE_LIMITS.atlasPixels || atlasWidth > SPRITE_LIMITS.canvasSide || atlasHeight > SPRITE_LIMITS.canvasSide) throw new Error(`The atlas would be ${atlasWidth} × ${atlasHeight}. Reduce scale, export fewer frames, or change the column count. Maximum: 16 megapixels and 8192 pixels per side.`);
  if (options.background === "gif" && !gifBackground(gif)) throw new Error("This GIF has no global background color. Choose transparent background.");
  const background = options.background === "gif" ? gifBackground(gif) : null;
  const paint = painter(gif, background);
  const [atlas, ctx] = makeCanvas(atlasWidth, atlasHeight);
  const [frameCanvas, frameContext] = makeCanvas(options.includeFrames ? width : 1, options.includeFrames ? height : 1);
  const prefix = baseName(file.name);
  const files: SpriteOutput[] = [];
  const entries: { filename: string; frame: { x: number; y: number; w: number; h: number }; rotated: false; trimmed: false; spriteSourceSize: { x: number; y: number; w: number; h: number }; sourceSize: { w: number; h: number }; duration: number; sourceFrame: number; sourceStartMs: number; sourceFrameEnd: number }[] = [];
  const timeline: number[] = [0];
  for (const frame of frames) timeline.push(timeline[timeline.length - 1] + delay(frame));
  let encodedBytes = 0;
  try {
    for (let index = 0; index < end; index++) {
      paint.draw(frames[index]);
      // Earlier and skipped frames still participate in disposal/composition.
      if (index >= start && (index - start) % stride === 0) {
        const slot = entries.length, x = (slot % columns) * cellWidth + padding, y = Math.floor(slot / columns) * cellHeight + padding;
        ctx.drawImage(paint.canvas, 0, 0, gif.lsd.width, gif.lsd.height, x, y, width, height);
        const next = Math.min(index + stride, end);
        const filename = `${prefix}_${String(slot + 1).padStart(4, "0")}.png`;
        entries.push({ filename, frame: { x, y, w: width, h: height }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: width, h: height }, sourceSize: { w: width, h: height }, duration: timeline[next] - timeline[index], sourceFrame: index, sourceStartMs: timeline[index], sourceFrameEnd: next - 1 });
        if (options.includeFrames) {
          frameContext.clearRect(0, 0, width, height);
          frameContext.drawImage(paint.canvas, 0, 0, width, height);
          const blob = await png(frameCanvas);
          encodedBytes += blob.size;
          if (encodedBytes > SPRITE_LIMITS.outputBytes) throw new Error("The individual PNGs exceed 64 MiB. Disable individual frames, lower scale, or export a smaller range.");
          files.push({ name: `frames/${filename}`, blob });
        }
      }
      if (index % 8 === 0 || index === end - 1) progress({ value: 0.85 * (index + 1) / end, label: `Compositing frame ${index + 1} of ${end}` });
    }
    progress({ value: 0.9, label: "Encoding sprite sheet" });
    const atlasBlob = await png(atlas);
    encodedBytes += atlasBlob.size;
    if (encodedBytes > SPRITE_LIMITS.outputBytes) throw new Error("The exported PNGs exceed 64 MiB. Reduce scale or the exported frame range.");
    const atlasName = `${prefix}-sprites.png`;
    const manifest = {
      frames: entries,
      meta: { app: "Game Asset Toolkit", schemaVersion: 1, image: atlasName, format: "RGBA8888", size: { w: atlasWidth, h: atlasHeight }, scale: String(options.scale), columns, rows, padding, source: file.name, sourceSize: { w: gif.lsd.width, h: gif.lsd.height }, sourceFrameCount: frames.length, sourceRange: { first: start, last: end - 1 }, sourceIndexBase: 0, frameInterval: stride, durationMs: timeline[end] - timeline[start], sourceLoopCount: loopCount(gif), loopCountNote: "0 means infinite; null means no loop extension. Positive values preserve the GIF extension value.", background: options.background, timing: "Frame durations are milliseconds; sampled frames hold for the sum of the source durations they represent.", filtering: "nearest-neighbor" },
    };
    files.unshift({ name: atlasName, blob: atlasBlob }, { name: `${prefix}-sprites.json`, blob: new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }) });
    if (options.background === "transparent") warnings.push("Transparent background is used for the initial canvas and restore-to-background disposal. Choose GIF background to preserve its global palette background color.");
    if (stride > 1) warnings.push("Sampled frames keep the full selected duration by holding until the next exported frame; intermediate motion is omitted.");
    progress({ value: 1, label: "Sprite sheet ready" });
    return { files, zipName: `${prefix}-sprites.zip`, preview: await thumbnail(atlas, atlasWidth, atlasHeight), summary: `${entries.length} sprites · ${atlasWidth} × ${atlasHeight} atlas · ${((timeline[end] - timeline[start]) / 1000).toFixed(2)} s`, warnings };
  } finally { paint.dispose(); atlas.width = atlas.height = frameCanvas.width = frameCanvas.height = 1; }
}
