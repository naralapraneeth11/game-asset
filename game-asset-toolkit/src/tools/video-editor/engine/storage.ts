import { StreamTarget, type StreamTargetChunk } from "mediabunny";
import { LIMITS } from "../types";

const DIRECTORY = "game-asset-toolkit-video-v1";
const PAGE_SIZE = 1024 * 1024;
const owned = new Set<string>();
type SyncAccess = {
  write(buffer: Uint8Array<ArrayBuffer>, options: { at: number }): number;
  truncate(size: number): void; flush(): void; close(): void;
};
type SyncFile = FileSystemFileHandle & { createSyncAccessHandle?: () => Promise<SyncAccess> };

export interface OutputStorage {
  target: StreamTarget;
  workspaceId?: string;
  finish(type: string): Promise<Blob>;
  abort(): Promise<void>;
}

function validateId(id: string): void {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) throw new Error("Invalid export workspace identifier.");
}

function storageError(error: unknown): Error {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new Error("Browser storage is full. Download and remove completed results, free some disk space, or reduce the export size.");
  }
  return error instanceof Error ? error : new Error("The browser could not write the export to local storage.");
}

/** Removes only this tool's named export, never user-selected files. */
export async function releaseOutput(workspaceId: string): Promise<void> {
  validateId(workspaceId);
  try {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle(DIRECTORY);
    await directory.removeEntry(workspaceId, { recursive: true });
    owned.delete(workspaceId);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") { owned.delete(workspaceId); return; }
    throw storageError(error);
  }
}

/** Other tabs' retained exports are intentionally left alone. */
export async function clearWorkspace(): Promise<void> {
  const results = await Promise.allSettled([...owned].map(releaseOutput));
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}

async function diskStorage(id: string): Promise<OutputStorage | null> {
  if (!navigator.storage?.getDirectory) return null;
  let directory: FileSystemDirectoryHandle;
  try {
    const root = await navigator.storage.getDirectory();
    directory = await root.getDirectoryHandle(DIRECTORY, { create: true });
  } catch (error) {
    if (error instanceof DOMException && ["SecurityError", "NotAllowedError", "NotSupportedError"].includes(error.name)) return null;
    throw storageError(error);
  }
  const workspace = await directory.getDirectoryHandle(id, { create: true });
  owned.add(id);
  const file = await workspace.getFileHandle("output", { create: true }) as SyncFile;
  if (!file.createSyncAccessHandle) { await releaseOutput(id); return null; }
  let handle: SyncAccess | null = null;
  try { handle = await file.createSyncAccessHandle(); handle.truncate(0); }
  catch (error) {
    handle?.close();
    handle = null;
    await releaseOutput(id);
    if (error instanceof DOMException && ["SecurityError", "NotAllowedError", "NotSupportedError"].includes(error.name)) return null;
    throw storageError(error);
  }
  let length = 0;
  const close = () => { const access = handle; handle = null; access?.close(); };
  const writable = new WritableStream<StreamTargetChunk>({
    write({ data, position }) {
      if (!handle) throw new Error("The export file has been closed.");
      try {
        let offset = 0;
        while (offset < data.byteLength) {
          const written = handle.write(data.subarray(offset), { at: position + offset });
          if (written <= 0) throw new Error("The browser could not finish writing the export. Free disk space and retry.");
          offset += written;
        }
        length = Math.max(length, position + data.byteLength);
      } catch (error) { throw storageError(error); }
    },
    close() {
      try { handle?.truncate(length); handle?.flush(); }
      catch (error) { throw storageError(error); }
      finally { close(); }
    },
    abort() { close(); },
  });
  return {
    target: new StreamTarget(writable, { chunked: true, chunkSize: PAGE_SIZE }), workspaceId: id,
    async finish(type) {
      // A sync access handle must be closed before obtaining a consistent File snapshot.
      if (handle) {
        try { handle.truncate(length); handle.flush(); }
        finally { close(); }
      }
      const snapshot = await file.getFile();
      if (!snapshot.size) throw new Error("The encoder produced an empty file.");
      return snapshot.slice(0, snapshot.size, type);
    },
    async abort() { close(); await releaseOutput(id); },
  };
}

function memoryStorage(): OutputStorage {
  const pages = new Map<number, Uint8Array<ArrayBuffer>>();
  let length = 0;
  const writable = new WritableStream<StreamTargetChunk>({
    write({ data, position }) {
      const end = position + data.byteLength;
      if (!Number.isSafeInteger(end) || position < 0 || end > LIMITS.memoryOutput) {
        throw new Error("This browser cannot use disk-backed exports, and the output exceeded the 128 MiB memory limit. Shorten the clip, lower quality, or use a browser with OPFS support.");
      }
      let offset = 0;
      while (offset < data.byteLength) {
        const index = Math.floor((position + offset) / PAGE_SIZE);
        const start = (position + offset) % PAGE_SIZE;
        const count = Math.min(PAGE_SIZE - start, data.byteLength - offset);
        let page = pages.get(index);
        if (!page) { page = new Uint8Array(PAGE_SIZE); pages.set(index, page); }
        page.set(data.subarray(offset, offset + count), start);
        offset += count;
      }
      length = Math.max(length, end);
    },
    abort() { pages.clear(); length = 0; },
  });
  return {
    target: new StreamTarget(writable, { chunked: true, chunkSize: PAGE_SIZE }),
    async finish(type) {
      if (!length) throw new Error("The encoder produced an empty file.");
      const parts: BlobPart[] = [];
      for (let offset = 0; offset < length; offset += PAGE_SIZE) {
        const page = pages.get(offset / PAGE_SIZE) ?? new Uint8Array(PAGE_SIZE);
        parts.push(page.subarray(0, Math.min(PAGE_SIZE, length - offset)));
      }
      const blob = new Blob(parts, { type });
      pages.clear();
      return blob;
    },
    async abort() { pages.clear(); length = 0; },
  };
}

export async function createOutputStorage(id: string, estimatedBytes: number): Promise<OutputStorage> {
  validateId(id);
  const disk = await diskStorage(id);
  if (disk) {
    const estimate = await navigator.storage.estimate().catch(() => null);
    if (estimate?.quota !== undefined && estimate.usage !== undefined && estimatedBytes > (estimate.quota - estimate.usage) * 0.9) {
      await disk.abort();
      throw new Error("The estimated export is larger than the browser's available disk quota. Remove completed results, lower the target size, or trim the clip.");
    }
    return disk;
  }
  if (estimatedBytes > LIMITS.memoryOutput * 0.9) {
    throw new Error("This export is too large for this browser's 128 MiB memory fallback. Enable browser storage, lower the target size, or shorten the clip.");
  }
  return memoryStorage();
}
