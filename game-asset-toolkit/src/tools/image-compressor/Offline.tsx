"use client";
import { useEffect, useRef, useState } from "react";
import { Download, WifiOff } from "lucide-react";
import styles from "./ImageCompressor.module.css";
const SCOPE = "/tools/image-compressor";
export default function Offline({ onNotice }: { onNotice: (message: string) => void }) {
  const [status, setStatus] = useState<"idle" | "preparing" | "ready">("idle"), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function prepare() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) { onNotice("Offline preparation requires a secure HTTPS site and service worker support."); return; }
    setStatus("preparing");
    try {
      const registration = await navigator.serviceWorker.register("/image-compressor-sw.js", { scope: SCOPE });
      const worker = registration.active || registration.installing || registration.waiting;
      if (!worker) throw new Error("The offline worker could not start.");
      if (worker.state !== "activated") await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { worker.removeEventListener("statechange", changed); reject(new Error("Offline activation timed out.")); }, 15_000);
        const changed = () => { if (worker.state === "activated" || worker.state === "redundant") { clearTimeout(timer); worker.removeEventListener("statechange", changed); worker.state === "activated" ? resolve() : reject(new Error("Offline worker activation failed.")); } };
        worker.addEventListener("statechange", changed); changed();
      });
      const channel = new MessageChannel();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { channel.port1.close(); reject(new Error("Offline preparation timed out. Reconnect and try again.")); }, 120_000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); event.data?.ok ? resolve() : reject(new Error(event.data?.error || "Offline preparation failed.")); };
        worker.postMessage({ type: "prepare" }, [channel.port2]);
      });
      if (alive.current) { setStatus("ready"); onNotice("Offline assets are ready. Bookmark this tool's URL; reopen it directly after the first online visit. Images are never cached."); }
    } catch (e) { if (alive.current) { setStatus("idle"); onNotice((e as Error).message); } }
  }
  async function forget() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration(SCOPE);
      if (registration?.scope === new URL(SCOPE, location.origin).href) await registration.unregister();
      for (const key of await caches.keys()) if (key.startsWith("gat-image-compressor-")) await caches.delete(key);
      if (alive.current) { setStatus("idle"); onNotice("Image Compressor offline assets removed."); }
    } catch { onNotice("Offline assets could not be removed. Clear this site's storage in your browser settings."); }
  }
  return <div className={styles.offline}><div><WifiOff size={14} /><span>{status === "ready" ? "Offline assets prepared" : "Keep the tool available offline"}</span></div><div><button type="button" className={styles.textButton} onClick={prepare} disabled={status === "preparing"}><Download size={12} style={{ display: "inline", marginRight: 4 }} />{status === "preparing" ? "Preparing…" : status === "ready" ? "Refresh offline assets" : "Prepare for offline"}</button><button type="button" className={styles.textButton} onClick={forget} disabled={status === "preparing"}>Remove offline data</button></div></div>;
}
