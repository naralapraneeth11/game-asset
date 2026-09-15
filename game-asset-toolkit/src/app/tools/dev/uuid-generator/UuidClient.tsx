"use client";

import { useState } from "react";
import { ToolShell, CodeEditor, CopyButton } from "@/components/dev";

function uuidv4() {
  return crypto.randomUUID();
}

export function UuidClient() {
  const [count, setCount] = useState(1);
  const [output, setOutput] = useState("");

  const generate = () => {
    const list = Array.from({ length: Math.min(Math.max(count, 1), 100) }, () => uuidv4());
    setOutput(list.join("\n"));
  };

  return (
    <ToolShell title="UUID Generator" description="Generate cryptographically random UUID v4 values." actions={<CopyButton text={output} />}>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs text-muted-foreground">Count</label>
        <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
        <button type="button" onClick={generate} className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900">Generate</button>
      </div>
      <CodeEditor value={output} readOnly rows={12} placeholder="UUIDs will appear here" />
    </ToolShell>
  );
}
