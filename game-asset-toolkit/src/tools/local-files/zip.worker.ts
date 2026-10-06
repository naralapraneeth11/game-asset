import { Zip, ZipPassThrough } from "fflate";

type Entry = { name: string; blob: Blob };
const LIMIT = 128 * 1024 ** 2;
function pathFor(value: string): string {
  const parts = value.replace(/\\/g, "/").split("/").filter((part) => part && part !== "." && part !== "..");
  const safe = parts.map((part) => part.replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").slice(0, 160) || "file").join("/");
  return safe || "file";
}

self.onmessage = async ({ data }: MessageEvent<{ files: Entry[] }>) => {
  let zip: Zip | undefined;
  try {
    const files = data.files;
    if (!Array.isArray(files) || !files.length || files.length > 2048 || files.reduce((sum, item) => sum + item.blob.size, 0) > LIMIT) throw new Error("The ZIP exceeds the 128 MiB / 2,048-file limit.");
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let failure: Error | null = null, bytes = 0;
    zip = new Zip((error, chunk) => {
      if (error) { failure = error; return; }
      bytes += chunk.byteLength;
      if (bytes > LIMIT + 2 * 1024 ** 2) { failure = new Error("The ZIP exceeded its output memory limit."); return; }
      chunks.push(chunk as Uint8Array<ArrayBuffer>);
    });
    const names = new Set<string>();
    for (let index = 0; index < files.length; index++) {
      const source = files[index];
      const safe = pathFor(source.name);
      let name = safe, suffix = 2;
      while (names.has(name.toLowerCase())) {
        const dot = safe.lastIndexOf(".");
        name = dot > safe.lastIndexOf("/") ? `${safe.slice(0, dot)}_${suffix++}${safe.slice(dot)}` : `${safe}_${suffix++}`;
      }
      names.add(name.toLowerCase());
      const entry = new ZipPassThrough(name); zip.add(entry);
      const reader = source.blob.stream().getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          entry.push(value, false);
          if (failure) throw failure;
        }
        entry.push(new Uint8Array(), true);
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
      self.postMessage({ type: "progress", completed: index + 1, total: files.length });
    }
    zip.end();
    if (failure) throw failure;
    self.postMessage({ type: "done", blob: new Blob(chunks, { type: "application/zip" }) });
  } catch (error) { self.postMessage({ type: "error", error: error instanceof Error ? error.message : "ZIP creation failed." }); }
  finally { zip?.terminate(); }
};
