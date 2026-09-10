import type { InputFile } from "./useCompressor";
export async function droppedFiles(transfer: DataTransfer): Promise<InputFile[]> {
  const result: InputFile[] = []; let visited = 0;
  async function walk(entry: FileSystemEntry, prefix: string, depth: number): Promise<void> {
    if (++visited > 2000 || depth > 12 || result.length >= 100) return;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      result.push({ file, path: prefix + file.name });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      while (visited <= 2000 && result.length < 100) {
        const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (!entries.length) break;
        for (const child of entries) await walk(child, prefix + entry.name + "/", depth + 1);
      }
    }
  }
  // Capture entries synchronously while the drop data store is readable.
  const entries = Array.from(transfer.items).map(x => x.webkitGetAsEntry?.()).filter((x): x is FileSystemEntry => !!x);
  const fallback = Array.from(transfer.files);
  if (entries.length) for (const entry of entries) await walk(entry, "", 0);
  else for (const file of fallback.slice(0, 100)) result.push({ file, path: file.name });
  return result;
}
export async function sampleImage(): Promise<File> {
  const canvas = document.createElement("canvas"); canvas.width = 768; canvas.height = 512;
  const context = canvas.getContext("2d")!;
  const fill = context.createLinearGradient(0, 0, 768, 512); fill.addColorStop(0, "#ffc685"); fill.addColorStop(1, "#d67850");
  context.fillStyle = fill; context.fillRect(0, 0, 768, 512);
  context.fillStyle = "#f5e9d6"; context.beginPath(); context.arc(548, 190, 102, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#433d40"; context.beginPath(); context.moveTo(0, 420); context.lineTo(230, 175); context.lineTo(485, 512); context.lineTo(0, 512); context.fill();
  context.fillStyle = "#746369"; context.beginPath(); context.moveTo(260, 512); context.lineTo(530, 285); context.lineTo(768, 512); context.fill();
  context.fillStyle = "#fff5e9"; context.font = "500 21px system-ui"; context.fillText("GAME ASSET TOOLKIT", 36, 52);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Could not create sample.")), "image/png"));
  canvas.width = canvas.height = 1;
  return new File([blob], "sample-landscape.png", { type: "image/png" });
}
