/** Decimal units (1 MB = 1,000,000 bytes), matching how file managers and upload limits count. */
export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1000) return `${Math.round(value)} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1000;
  let unit = 0;
  while (size >= 1000 && unit < units.length - 1) { size /= 1000; unit++; }
  return `${size.toFixed(size < 10 ? 2 : size < 100 ? 1 : 0)} ${units[unit]}`;
}

/** Percent saved going from `before` to `after` bytes; negative when the output grew. */
export function percentSaved(before: number, after: number): number {
  return before > 0 ? (1 - after / before) * 100 : 0;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
