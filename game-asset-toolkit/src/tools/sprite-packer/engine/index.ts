/**
 * Custom Sprite Packer Engine v2.1.1
 * Production-grade · Web-first · Deterministic
 * TexturePacker-compatible metadata for Phaser / Pixi / Unity / Godot
 */

export const VERSION = "2.1.1";
export const APP_NAME = "CustomSpritePacker";

export type Heuristic = "BSSF" | "BAF" | "CP";
export type OutputFormat = "png" | "webp";

export interface PackerConfig {
  maxWidth: number;
  maxHeight: number;
  padding: number;
  extrusion: number;
  rotation: boolean;
  heuristic: Heuristic;
  scaleFactor: number;
  alphaThreshold: number;
  alphaSafetyMargin: number;
  powerOfTwo: boolean;
  format: OutputFormat;
  quality: number;
  pivot: { x: number; y: number };
}

export const DEFAULT_CONFIG: Readonly<PackerConfig> = Object.freeze({
  maxWidth: 2048,
  maxHeight: 2048,
  padding: 2,
  extrusion: 1,
  rotation: true,
  heuristic: "BSSF",
  scaleFactor: 1,
  alphaThreshold: 0,
  alphaSafetyMargin: 0,
  powerOfTwo: false,
  format: "png",
  quality: 0.92,
  pivot: { x: 0.5, y: 0.5 },
});

export type ProgressInfo = {
  phase: "loading" | "packing";
  progress: number;
  current?: string;
  page?: number;
};

export type FrameMeta = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  trimmed: boolean;
  offsetX: number;
  offsetY: number;
  contentWidth: number;
  contentHeight: number;
  sourceWidth: number;
  sourceHeight: number;
};

export type AtlasResult = {
  page: number;
  image: Blob;
  imageName: string;
  metadata: ReturnType<MetadataExporter["export"]>;
  frames: FrameMeta[];
  efficiency: number;
  canvas: HTMLCanvasElement | OffscreenCanvas;
};

export type PackResult = {
  atlases: AtlasResult[];
  totalSprites: number;
  totalPages: number;
  duration: string;
  config: PackerConfig;
};

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

class Utils {
  static nextPowerOfTwo(value: number): number {
    if (value <= 0) return 1;
    let v = value - 1;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    return v + 1;
  }

  static stableSort<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
    return array
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const result = compareFn(a.item, b.item);
        return result !== 0 ? result : a.index - b.index;
      })
      .map(({ item }) => item);
  }

  static hash(data: unknown): string {
    let hash = 0;
    const str = typeof data === "string" ? data : JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Alpha trim
// ---------------------------------------------------------------------------

class AlphaTrimmer {
  constructor(private threshold = 0) {}

  trim(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    safetyMargin = 0
  ) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = pixels[(y * width + x) * 4 + 3];
        if (alpha > this.threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return {
        trimmed: false,
        bounds: { x: 0, y: 0, w: width, h: height },
        offset: { x: 0, y: 0 },
        sourceSize: { w: width, h: height },
      };
    }

    if (safetyMargin > 0) {
      minX = Math.max(0, minX - safetyMargin);
      minY = Math.max(0, minY - safetyMargin);
      maxX = Math.min(width - 1, maxX + safetyMargin);
      maxY = Math.min(height - 1, maxY + safetyMargin);
    }

    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;

    return {
      trimmed: trimmedWidth < width || trimmedHeight < height,
      bounds: { x: minX, y: minY, w: trimmedWidth, h: trimmedHeight },
      offset: { x: minX, y: minY },
      sourceSize: { w: width, h: height },
    };
  }

  extract(imageData: ImageData, bounds: { x: number; y: number; w: number; h: number }) {
    const { x, y, w, h } = bounds;
    const trimmed = new ImageData(w, h);
    for (let row = 0; row < h; row++) {
      const srcOffset = ((y + row) * imageData.width + x) * 4;
      const dstOffset = row * w * 4;
      trimmed.data.set(
        imageData.data.subarray(srcOffset, srcOffset + w * 4),
        dstOffset
      );
    }
    return trimmed;
  }
}

// ---------------------------------------------------------------------------
// MaxRects
// ---------------------------------------------------------------------------

type FreeRect = { x: number; y: number; w: number; h: number };

class MaxRectsPacker {
  freeRects: FreeRect[];
  placed: FreeRect[] = [];

  constructor(
    public atlasWidth: number,
    public atlasHeight: number,
    public rotation = true,
    public heuristic: Heuristic = "BSSF"
  ) {
    this.freeRects = [{ x: 0, y: 0, w: atlasWidth, h: atlasHeight }];
  }

  private scoreFor(freeRect: FreeRect, w: number, h: number): number {
    if (this.heuristic === "BAF") {
      return (freeRect.w - w) * (freeRect.h - h);
    }
    if (this.heuristic === "CP") {
      let score = 0;
      if (freeRect.x === 0) score += h;
      if (freeRect.y === 0) score += w;
      if (freeRect.x + freeRect.w === this.atlasWidth) score += h;
      if (freeRect.y + freeRect.h === this.atlasHeight) score += w;
      for (const p of this.placed) {
        if (p.x === freeRect.x + w) score += h;
        if (p.y === freeRect.y + h) score += w;
        if (p.x + p.w === freeRect.x) score += h;
        if (p.y + p.h === freeRect.y) score += w;
      }
      return -score;
    }
    return Math.min(freeRect.w - w, freeRect.h - h);
  }

  private findBestRect(spriteWidth: number, spriteHeight: number, rotated: boolean) {
    const w = rotated ? spriteHeight : spriteWidth;
    const h = rotated ? spriteWidth : spriteHeight;
    let bestScore = Infinity;
    let bestSquareDiff = Infinity;
    let bestIndex = -1;

    for (let i = 0; i < this.freeRects.length; i++) {
      const rect = this.freeRects[i];
      if (rect.w >= w && rect.h >= h) {
        const score = this.scoreFor(rect, w, h);
        const squareDiff = Math.abs(rect.w - w - (rect.h - h));
        if (score < bestScore || (score === bestScore && squareDiff < bestSquareDiff)) {
          bestScore = score;
          bestSquareDiff = squareDiff;
          bestIndex = i;
        }
      }
    }
    return { index: bestIndex, rotated, score: bestScore };
  }

  private splitFreeRect(freeRect: FreeRect, placedRect: FreeRect): FreeRect[] {
    const splits: FreeRect[] = [];
    if (freeRect.x + freeRect.w > placedRect.x + placedRect.w) {
      splits.push({
        x: placedRect.x + placedRect.w,
        y: freeRect.y,
        w: freeRect.x + freeRect.w - placedRect.x - placedRect.w,
        h: freeRect.h,
      });
    }
    if (freeRect.y + freeRect.h > placedRect.y + placedRect.h) {
      splits.push({
        x: freeRect.x,
        y: placedRect.y + placedRect.h,
        w: freeRect.w,
        h: freeRect.y + freeRect.h - placedRect.y - placedRect.h,
      });
    }
    if (freeRect.x < placedRect.x) {
      splits.push({
        x: freeRect.x,
        y: freeRect.y,
        w: placedRect.x - freeRect.x,
        h: freeRect.h,
      });
    }
    if (freeRect.y < placedRect.y) {
      splits.push({
        x: freeRect.x,
        y: freeRect.y,
        w: freeRect.w,
        h: placedRect.y - freeRect.y,
      });
    }
    return splits.filter((r) => r.w > 0 && r.h > 0);
  }

  private pruneFreeRects() {
    const pruned: FreeRect[] = [];
    for (const rect of this.freeRects) {
      let contained = false;
      for (const other of this.freeRects) {
        if (rect === other) continue;
        if (
          other.x <= rect.x &&
          other.y <= rect.y &&
          other.x + other.w >= rect.x + rect.w &&
          other.y + other.h >= rect.y + rect.h
        ) {
          contained = true;
          break;
        }
      }
      if (!contained) pruned.push(rect);
    }
    this.freeRects = pruned;
  }

  pack(sprite: { packedWidth: number; packedHeight: number }) {
    const width = sprite.packedWidth;
    const height = sprite.packedHeight;
    const upright = this.findBestRect(width, height, false);
    let best = upright;

    if (this.rotation && width !== height) {
      const rotated = this.findBestRect(width, height, true);
      if (
        rotated.index !== -1 &&
        (upright.index === -1 || rotated.score < upright.score)
      ) {
        best = rotated;
      }
    }

    if (best.index === -1) return null;

    const freeRect = this.freeRects[best.index];
    const placedWidth = best.rotated ? height : width;
    const placedHeight = best.rotated ? width : height;
    const placement = {
      x: freeRect.x,
      y: freeRect.y,
      w: placedWidth,
      h: placedHeight,
      rotated: best.rotated,
    };

    this.freeRects.splice(best.index, 1);
    this.freeRects.push(...this.splitFreeRect(freeRect, placement));
    this.pruneFreeRects();
    this.placed.push(placement);
    return placement;
  }

  getEfficiency() {
    const total = this.atlasWidth * this.atlasHeight;
    const used = this.placed.reduce((s, p) => s + p.w * p.h, 0);
    return (used / total) * 100;
  }
}

// ---------------------------------------------------------------------------
// Edge extrusion
// ---------------------------------------------------------------------------

class EdgeExtruder {
  constructor(private extrusion = 1) {}

  extrude(imageData: ImageData, padding: number): ImageData {
    const origW = imageData.width;
    const origH = imageData.height;
    if (padding <= 0) return imageData;

    const newW = origW + padding * 2;
    const newH = origH + padding * 2;
    const extruded = new ImageData(newW, newH);
    const src = imageData.data;
    const dst = extruded.data;

    for (let y = 0; y < origH; y++) {
      const srcRow = y * origW * 4;
      const dstRow = (y + padding) * newW * 4 + padding * 4;
      dst.set(src.subarray(srcRow, srcRow + origW * 4), dstRow);
    }

    const extrusionAmount = Math.max(0, Math.min(this.extrusion, padding));
    if (extrusionAmount === 0) return extruded;

    for (let e = 0; e < extrusionAmount; e++) {
      const offset = e + 1;
      for (let y = 0; y < origH; y++) {
        const srcIdx = y * origW * 4;
        const dstIdx = ((y + padding) * newW + padding - offset) * 4;
        dst.set(src.subarray(srcIdx, srcIdx + 4), dstIdx);
      }
      for (let y = 0; y < origH; y++) {
        const srcIdx = (y * origW + origW - 1) * 4;
        const dstIdx = ((y + padding) * newW + padding + origW + offset - 1) * 4;
        dst.set(src.subarray(srcIdx, srcIdx + 4), dstIdx);
      }
      for (let x = 0; x < origW; x++) {
        const srcIdx = x * 4;
        const dstIdx = ((padding - offset) * newW + padding + x) * 4;
        dst.set(src.subarray(srcIdx, srcIdx + 4), dstIdx);
      }
      for (let x = 0; x < origW; x++) {
        const srcIdx = ((origH - 1) * origW + x) * 4;
        const dstIdx = ((padding + origH + offset - 1) * newW + padding + x) * 4;
        dst.set(src.subarray(srcIdx, srcIdx + 4), dstIdx);
      }
    }

    for (let e = 0; e < extrusionAmount; e++) {
      const offset = e + 1;
      const tl = 0;
      const tr = (origW - 1) * 4;
      const bl = (origH - 1) * origW * 4;
      const br = ((origH - 1) * origW + origW - 1) * 4;
      dst.set(src.subarray(tl, tl + 4), ((padding - offset) * newW + padding - offset) * 4);
      dst.set(
        src.subarray(tr, tr + 4),
        ((padding - offset) * newW + padding + origW + offset - 1) * 4
      );
      dst.set(
        src.subarray(bl, bl + 4),
        ((padding + origH + offset - 1) * newW + padding - offset) * 4
      );
      dst.set(
        src.subarray(br, br + 4),
        ((padding + origH + offset - 1) * newW + padding + origW + offset - 1) * 4
      );
    }

    return extruded;
  }
}

// ---------------------------------------------------------------------------
// Compositor
// ---------------------------------------------------------------------------

class TextureCompositor {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  constructor(width: number, height: number) {
    if (typeof document !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.canvas.width = width;
      this.canvas.height = height;
    } else if (typeof OffscreenCanvas !== "undefined") {
      this.canvas = new OffscreenCanvas(width, height);
    } else {
      throw new Error("SpritePacker: no canvas available");
    }
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("SpritePacker: 2d context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  blit(
    spriteData: ImageData,
    placement: { x: number; y: number; h: number; rotated: boolean }
  ) {
    if (!placement.rotated) {
      this.ctx.putImageData(spriteData, placement.x, placement.y);
      return;
    }

    let tempCanvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof document !== "undefined") {
      tempCanvas = document.createElement("canvas");
      tempCanvas.width = spriteData.width;
      tempCanvas.height = spriteData.height;
    } else {
      tempCanvas = new OffscreenCanvas(spriteData.width, spriteData.height);
    }
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;
    tempCtx.putImageData(spriteData, 0, 0);

    this.ctx.save();
    this.ctx.translate(placement.x + placement.h, placement.y);
    this.ctx.rotate(Math.PI / 2);
    this.ctx.drawImage(tempCanvas as CanvasImageSource, 0, 0);
    this.ctx.restore();
  }

  async export(format: OutputFormat = "png", quality = 0.92): Promise<Blob> {
    const type = `image/${format}`;
    if ("convertToBlob" in this.canvas && typeof this.canvas.convertToBlob === "function") {
      return this.canvas.convertToBlob({ type, quality });
    }
    const canvas = this.canvas as HTMLCanvasElement;
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
        type,
        quality
      );
    });
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

class MetadataExporter {
  constructor(private config: PackerConfig) {}

  export(frames: FrameMeta[], imageName: string, atlasWidth: number, atlasHeight: number) {
    const frameMap: Record<string, unknown> = {};
    for (const frame of frames) {
      frameMap[frame.name] = {
        frame: { x: frame.x, y: frame.y, w: frame.w, h: frame.h },
        rotated: frame.rotated,
        trimmed: frame.trimmed,
        spriteSourceSize: {
          x: frame.offsetX,
          y: frame.offsetY,
          w: frame.contentWidth,
          h: frame.contentHeight,
        },
        sourceSize: { w: frame.sourceWidth, h: frame.sourceHeight },
        pivot: { x: this.config.pivot.x, y: this.config.pivot.y },
      };
    }

    return {
      meta: {
        app: APP_NAME,
        version: VERSION,
        image: imageName,
        format: "RGBA8888",
        size: { w: atlasWidth, h: atlasHeight },
        scale: this.config.scaleFactor.toString(),
        smartupdate: `$TexturePacker:SmartUpdate:${Utils.hash(frames)}$`,
      },
      frames: frameMap,
    };
  }

  toJSON(data: unknown) {
    return JSON.stringify(data, null, 2);
  }
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

type LoadedSprite = {
  name: string;
  imageData: ImageData;
  sourceWidth: number;
  sourceHeight: number;
};

type ProcessedSprite = {
  name: string;
  contentWidth: number;
  contentHeight: number;
  packedWidth: number;
  packedHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  offsetX: number;
  offsetY: number;
  trimmed: boolean;
  imageData: ImageData;
};

export class SpritePacker {
  config: PackerConfig;
  private alphaTrimmer: AlphaTrimmer;
  private edgeExtruder: EdgeExtruder;
  private metadataExporter: MetadataExporter;
  private progressCallback: ((p: ProgressInfo) => void) | null = null;
  private destroyed = false;

  constructor(config: Partial<PackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.alphaTrimmer = new AlphaTrimmer(this.config.alphaThreshold);
    this.edgeExtruder = new EdgeExtruder(this.config.extrusion);
    this.metadataExporter = new MetadataExporter(this.config);
  }

  onProgress(callback: (p: ProgressInfo) => void) {
    this.progressCallback = callback;
  }

  private async loadSprite(file: File): Promise<LoadedSprite> {
    const scale = this.config.scaleFactor;

    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);
      const canvas =
        typeof document !== "undefined"
          ? document.createElement("canvas")
          : new OffscreenCanvas(width, height);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true }) as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D
        | null;
      if (!ctx) throw new Error("2d context unavailable");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      return {
        name: (file.name || "sprite").replace(/\.[^/.]+$/, ""),
        imageData: ctx.getImageData(0, 0, width, height),
        sourceWidth: width,
        sourceHeight: height,
      };
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("2d context unavailable"));
          return;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        resolve({
          name: (file.name || "sprite").replace(/\.[^/.]+$/, ""),
          imageData: ctx.getImageData(0, 0, width, height),
          sourceWidth: width,
          sourceHeight: height,
        });
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      };
      img.src = objectUrl;
    });
  }

  private processSprite(sprite: LoadedSprite): ProcessedSprite {
    const trimResult = this.alphaTrimmer.trim(
      sprite.imageData.data,
      sprite.sourceWidth,
      sprite.sourceHeight,
      this.config.alphaSafetyMargin
    );

    let contentData = sprite.imageData;
    if (trimResult.trimmed) {
      contentData = this.alphaTrimmer.extract(sprite.imageData, trimResult.bounds);
    }

    const packedData = this.edgeExtruder.extrude(contentData, this.config.padding);

    return {
      name: sprite.name,
      contentWidth: contentData.width,
      contentHeight: contentData.height,
      packedWidth: packedData.width,
      packedHeight: packedData.height,
      sourceWidth: sprite.sourceWidth,
      sourceHeight: sprite.sourceHeight,
      offsetX: trimResult.offset.x,
      offsetY: trimResult.offset.y,
      trimmed: trimResult.trimmed,
      imageData: packedData,
    };
  }

  async pack(files: File[]): Promise<PackResult> {
    if (this.destroyed) {
      throw new Error("SpritePacker has been destroyed and cannot be reused.");
    }

    const startTime = performance.now();
    const loadedSprites: LoadedSprite[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const sprite = await this.loadSprite(files[i]);
        loadedSprites.push(sprite);
        this.progressCallback?.({
          phase: "loading",
          progress: (i + 1) / files.length,
          current: sprite.name,
        });
      } catch (error) {
        console.warn(`Failed to load ${files[i].name || "file"}:`, error);
      }
    }

    if (loadedSprites.length === 0) {
      throw new Error("No sprites could be loaded.");
    }

    const processedSprites = loadedSprites.map((s) => this.processSprite(s));
    const sortedSprites = Utils.stableSort(processedSprites, (a, b) => {
      const areaA = a.packedWidth * a.packedHeight;
      const areaB = b.packedWidth * b.packedHeight;
      if (areaB !== areaA) return areaB - areaA;
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    const atlases: AtlasResult[] = [];
    let currentPage = 0;
    let spriteIndex = 0;
    const padding = this.config.padding;

    while (spriteIndex < sortedSprites.length) {
      const atlasWidth = this.config.powerOfTwo
        ? Utils.nextPowerOfTwo(this.config.maxWidth)
        : this.config.maxWidth;
      const atlasHeight = this.config.powerOfTwo
        ? Utils.nextPowerOfTwo(this.config.maxHeight)
        : this.config.maxHeight;

      const packer = new MaxRectsPacker(
        atlasWidth,
        atlasHeight,
        this.config.rotation,
        this.config.heuristic
      );
      const compositor = new TextureCompositor(atlasWidth, atlasHeight);
      const pageFrames: FrameMeta[] = [];
      const pageStartIndex = spriteIndex;

      while (spriteIndex < sortedSprites.length) {
        const sprite = sortedSprites[spriteIndex];
        const placement = packer.pack(sprite);
        if (!placement) break;

        compositor.blit(sprite.imageData, {
          x: placement.x,
          y: placement.y,
          h: sprite.packedHeight,
          rotated: placement.rotated,
        });

        pageFrames.push({
          name: sprite.name,
          x: placement.x + padding,
          y: placement.y + padding,
          w: placement.rotated ? sprite.contentHeight : sprite.contentWidth,
          h: placement.rotated ? sprite.contentWidth : sprite.contentHeight,
          rotated: placement.rotated,
          trimmed: sprite.trimmed,
          offsetX: sprite.offsetX,
          offsetY: sprite.offsetY,
          contentWidth: sprite.contentWidth,
          contentHeight: sprite.contentHeight,
          sourceWidth: sprite.sourceWidth,
          sourceHeight: sprite.sourceHeight,
        });

        spriteIndex++;
        this.progressCallback?.({
          phase: "packing",
          progress: spriteIndex / sortedSprites.length,
          current: sprite.name,
          page: currentPage + 1,
        });
      }

      if (pageFrames.length === 0 && spriteIndex === pageStartIndex) {
        throw new Error(
          `Sprite "${sortedSprites[spriteIndex].name}" is too large for atlas (${atlasWidth}×${atlasHeight})`
        );
      }

      const imageName = `sheet_${String(currentPage + 1).padStart(2, "0")}.${this.config.format}`;
      const blob = await compositor.export(this.config.format, this.config.quality);
      const metadata = this.metadataExporter.export(
        pageFrames,
        imageName,
        atlasWidth,
        atlasHeight
      );

      atlases.push({
        page: currentPage + 1,
        image: blob,
        imageName,
        metadata,
        frames: pageFrames,
        efficiency: packer.getEfficiency(),
        canvas: compositor.canvas,
      });

      currentPage++;
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);

    return {
      atlases,
      totalSprites: sortedSprites.length,
      totalPages: atlases.length,
      duration,
      config: this.config,
    };
  }

  async download(result: PackResult) {
    for (const atlas of result.atlases) {
      const imageURL = URL.createObjectURL(atlas.image);
      const imageLink = document.createElement("a");
      imageLink.href = imageURL;
      imageLink.download = atlas.imageName;
      imageLink.click();
      URL.revokeObjectURL(imageURL);

      const jsonStr = this.metadataExporter.toJSON(atlas.metadata);
      const jsonBlob = new Blob([jsonStr], { type: "application/json" });
      const jsonURL = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement("a");
      jsonLink.href = jsonURL;
      jsonLink.download = atlas.imageName.replace(/\.[^/.]+$/, ".json");
      jsonLink.click();
      URL.revokeObjectURL(jsonURL);

      await Utils.delay(100);
    }
  }

  destroy() {
    this.destroyed = true;
    this.progressCallback = null;
  }
}

export function createSpritePacker(config: Partial<PackerConfig> = {}) {
  return new SpritePacker(config);
}
