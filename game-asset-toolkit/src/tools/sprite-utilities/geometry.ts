import { SPRITE_LIMITS, type SplitOptions } from "./types";

export interface Cell { index: number; row: number; column: number; x: number; y: number; width: number; height: number }
export interface Grid { columns: number; rows: number; cellWidth: number; cellHeight: number; unusedRight: number; unusedBottom: number; cells: Cell[] }

export function integer(value: number, name: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name} must be a whole number between ${minimum} and ${maximum}.`);
  return value;
}

export function splitGrid(width: number, height: number, options: SplitOptions): Grid {
  const margin = integer(options.margin, "Margin", 0, 4096);
  const gutter = integer(options.gutter, "Gutter", 0, 4096);
  const offsetX = integer(options.offsetX, "Horizontal offset", 0, width - 1);
  const offsetY = integer(options.offsetY, "Vertical offset", 0, height - 1);
  integer(options.padding, "Output padding", 0, 128);
  const availableWidth = width - margin * 2 - offsetX;
  const availableHeight = height - margin * 2 - offsetY;
  if (availableWidth < 1 || availableHeight < 1) throw new Error("The margins and offset leave no image area. Reduce them.");
  let columns: number, rows: number, cellWidth: number, cellHeight: number;
  if (options.sizing === "grid") {
    columns = integer(options.columns, "Columns", 1, SPRITE_LIMITS.splitFrames);
    rows = integer(options.rows, "Rows", 1, SPRITE_LIMITS.splitFrames);
    const innerWidth = availableWidth - gutter * (columns - 1);
    const innerHeight = availableHeight - gutter * (rows - 1);
    if (innerWidth < columns || innerHeight < rows) throw new Error("The grid does not fit. Reduce the rows, columns, margin, or gutter.");
    if (innerWidth % columns || innerHeight % rows) throw new Error("The usable dimensions do not divide evenly into this grid. Adjust the grid, margins, or offsets, or use cell dimensions to leave edge pixels unused.");
    cellWidth = innerWidth / columns;
    cellHeight = innerHeight / rows;
  } else {
    cellWidth = integer(options.cellWidth, "Cell width", 1, SPRITE_LIMITS.canvasSide);
    cellHeight = integer(options.cellHeight, "Cell height", 1, SPRITE_LIMITS.canvasSide);
    columns = Math.floor((availableWidth + gutter) / (cellWidth + gutter));
    rows = Math.floor((availableHeight + gutter) / (cellHeight + gutter));
    if (!columns || !rows) throw new Error("No complete cells fit. Reduce the cell dimensions or margins.");
  }
  if (columns * rows > SPRITE_LIMITS.splitFrames) throw new Error(`The grid contains ${columns * rows} cells. The limit is ${SPRITE_LIMITS.splitFrames}; increase the cell dimensions or use a smaller sheet.`);
  if ((cellWidth + 2 * options.padding) * (cellHeight + 2 * options.padding) > SPRITE_LIMITS.imagePixels) throw new Error("A padded cell is too large. Reduce the padding or cell dimensions.");
  const start = integer(options.start, "First cell", 1, columns * rows) - 1;
  const requestedCount = integer(options.count, "Cell count", 0, SPRITE_LIMITS.splitFrames);
  const count = requestedCount || columns * rows - start;
  if (start + count > columns * rows) throw new Error("The selected cell range goes beyond the grid. Reduce the count or first cell.");
  const cells: Cell[] = [];
  for (let index = start; index < start + count; index++) {
    const row = options.order === "column" ? index % rows : Math.floor(index / columns);
    const column = options.order === "column" ? Math.floor(index / rows) : index % columns;
    cells.push({ index, row, column, x: margin + offsetX + column * (cellWidth + gutter), y: margin + offsetY + row * (cellHeight + gutter), width: cellWidth, height: cellHeight });
  }
  return {
    columns, rows, cellWidth, cellHeight,
    unusedRight: availableWidth - columns * cellWidth - (columns - 1) * gutter,
    unusedBottom: availableHeight - rows * cellHeight - (rows - 1) * gutter,
    cells,
  };
}

export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_.-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 100) || "sprite";
}
