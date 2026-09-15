"use client";

import { useState } from "react";
import { ToolShell, CopyButton } from "@/components/dev";

export function TimestampClient() {
  const [unix, setUnix] = useState("");
  const [human, setHuman] = useState("");

  const fromUnix = () => {
    const n = Number(unix);
    if (isNaN(n)) return;
    const d = new Date(n * (String(unix).length > 11 ? 1 : 1000));
    setHuman(d.toISOString());
  };

  const fromHuman = () => {
    const d = new Date(human);
    if (isNaN(d.getTime())) return;
    setUnix(String(Math.floor(d.getTime() / 1000)));
  };

  const now = () => {
    const d = new Date();
    setUnix(String(Math.floor(d.getTime() / 1000)));
    setHuman(d.toISOString());
  };

  return (
    <ToolShell title="Timestamp Converter" description="Convert Unix timestamps to dates and back." actions={<button type="button" onClick={now} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Now</button>}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Unix Timestamp</label>
          <input value={unix} onChange={(e) => setUnix(e.target.value)} className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 font-mono text-sm" placeholder="1710000000" />
          <button type="button" onClick={fromUnix} className="mt-2 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900">To Date</button>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">ISO / Date</label>
          <input value={human} onChange={(e) => setHuman(e.target.value)} className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 font-mono text-sm" placeholder="2024-03-09T..."