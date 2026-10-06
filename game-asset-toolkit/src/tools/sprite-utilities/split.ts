import { makeCanvas, png, readSheet, thumbnail } from "./canvas";
import { baseName, splitGrid, type Cell } from "./geometry";
import { SPRITE_LIMITS, type ProgressHandler, type SplitOptions, type SpriteInfo, type SpriteOutput, type SpriteResult } from "./types";

export async function inspectSheet(file: File): Promise<SpriteInfo> {
  const bitmap = await readSheet(file);
  try { return { width: bitmap.width, height: bitmap.height, frameCount: 1, durationMs: 0, background: null, preview: await thumbnail(bitmap, bitmap.width, bitmap.height), warnings: [] }; }
  finally { bitmap.close(); }
}

export async function splitSheet(file: File, options: SplitOptions, progress: ProgressHandler): Promise<SpriteResult> {
  progress({ value: 0, label: "Reading sprite sheet" });
  const bitmap = await readSheet(file);
  let canvas: OffscreenCanvas | null = null;
  try {
    const grid = splitGrid(bitmap.width, bitmap.height, options);
    const width = grid.cellWidth + options.padding * 2, height = grid.cellHeight + options.padding * 2;
    if (width * height * grid.cells.length > SPRITE_LIMITS.decodePixels) throw new Error("The output cells are too large in total. Reduce padding or export a smaller cell range.");
    const pair = makeCanvas(width, height); canvas = pair[0]; const ctx = pair[1];
    const prefix = baseName(file.name);
    const files: SpriteOutput[] = [];
    const sprites: { name: string; sourceCell: number; row: number; column: number; source: Cell; size: { width: number; height: number }; padding: number }[] = [];
    const skipped: number[] = [];
    let encodedBytes = 0;
    for (let index = 0; index < grid.cells.length; index++) {
      const cell = grid.cells[index];
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, cell.x, cell.y, cell.width, cell.height, options.padding, options.padding, cell.width, cell.height);
      let empty = false;
      if (options.skipTransparent) {
        const pixels = ctx.getImageData(options.padding, options.padding, cell.width, cell.height).data;
        empty = true;
        for (let at = 3; at < pixels.length; at += 4) if (pixels[at]) { empty = false; break; }
      }
      if (empty) skipped.push(cell.index);
      else {
        const name = `${prefix}_${String(cell.index + 1).padStart(4, "0")}.png`;
        const blob = await png(canvas);
        encodedBytes += blob.size;
        if (encodedBytes > SPRITE_LIMITS.outputBytes) throw new Error("The output PNGs exceed 64 MiB. Export a smaller cell range.");
        files.push({ name, blob });
        sprites.push({ name, sourceCell: cell.index, row: cell.row, column: cell.column, source: cell, size: { width, height }, padding: options.padding });
      }
      progress({ value: 0.95 * (index + 1) / grid.cells.length, label: `Slicing cell ${index + 1} of ${grid.cells.length}` });
    }
    if (!sprites.length) throw new Error("All selected cells are fully transparent. Turn off “Skip transparent cells” or select a different range.");
    const manifest = { schemaVersion: 1, app: "Game Asset Toolkit", source: file.name, sourceSize: { width: bitmap.width, height: bitmap.height }, grid: { columns: grid.columns, rows: grid.rows, cellWidth: grid.cellWidth, cellHeight: grid.cellHeight, margin: options.margin, gutter: options.gutter, offsetX: options.offsetX, offsetY: options.offsetY, unusedRight: grid.unusedRight, unusedBottom: grid.unusedBottom }, order: options.order, indexBase: 0, sourceRange: { first: grid.cells[0].index, last: grid.cells[grid.cells.length - 1].index }, skippedTransparentCells: skipped, sprites };
    files.push({ name: `${prefix}-manifest.json`, blob: new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }) });
    const warnings = [];
    if (grid.unusedRight || grid.unusedBottom) warnings.push(`${grid.unusedRight} right-edge pixels and ${grid.unusedBottom} bottom-edge pixels fall outside complete cells and were not exported.`);
    if (skipped.length) warnings.push(`${skipped.length} fully transparent cells skipped. Original cell numbers are preserved in names and the manifest.`);
    progress({ value: 1, label: "Sprites ready" });
    return { files, zipName: `${prefix}-frames.zip`, preview: files[0].blob, summary: `${sprites.length} PNG sprites · ${width} × ${height} each · JSON manifest included`, warnings };
  } finally { bitmap.close(); if (canvas) canvas.width = canvas.height = 1; }
}
