import { gifToSheet, inspectGif } from "./gif";
import { inspectSheet, splitSheet } from "./split";
import type { WorkerReply, WorkerRequest } from "./types";

const worker = self as unknown as { onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null; postMessage: (reply: WorkerReply) => void };
let busy = false;
worker.onmessage = async (event) => {
  const request = event.data;
  if (busy) { worker.postMessage({ id: request.id, kind: "error", message: "Wait for the current operation to finish." }); return; }
  busy = true;
  try {
    if (request.action === "inspect") {
      const info = request.mode === "gif" ? await inspectGif(request.file) : await inspectSheet(request.file);
      worker.postMessage({ id: request.id, kind: "info", info });
    } else {
      const onProgress = (progress: { value: number; label: string }) => worker.postMessage({ id: request.id, kind: "progress", progress });
      const result = request.action === "gif" ? await gifToSheet(request.file, request.options, onProgress) : await splitSheet(request.file, request.options, onProgress);
      worker.postMessage({ id: request.id, kind: "result", result });
    }
  } catch (error) {
    worker.postMessage({ id: request.id, kind: "error", message: error instanceof Error ? error.message : "The image could not be processed. Try a smaller, standard GIF or PNG." });
  } finally { busy = false; }
};
