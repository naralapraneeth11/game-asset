"use client";

import { useState } from "react";
import { ToolShell, CodeEditor, CopyButton } from "@/components/dev";

async function digest(algo: string, text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function HashClient() {
  const [input, setInput] = useState("");
  const [algo, setAlgo] = useState("SHA-256");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const result = await digest(algo, input);
      setOutput(result);
    } catch {
      setOutput("Error generating hash");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="Hash Generator"
      description="Generate cryptographic hashes using the Web Crypto API. Everything stays on your device."
      actions={<CopyButton text={output} />}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={algo}
          onChange={(e) => setAlgo(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
        >
          <option value="SHA-1">SHA-1</option>
          <option value="SHA-256">SHA-256</option>
          <option value="SHA-384">SHA-384</option>
          <option value="SHA-512">SHA-512</option>
        </select>
        <button
          type="button"
          onClick={run}
          disabled={loading || !input}
          className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {loading ? "Hashing…" : "Generate"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Input</div>
          <CodeEditor value={input} onChange={setInput} rows={10} placeholder="Text to hash" />
        </div>
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Hash</div>
          <CodeEditor value={output} readOnly rows={10} placeholder="Hash will appear here" />
        </div>
      </div>
    </ToolShell>
  );
}
