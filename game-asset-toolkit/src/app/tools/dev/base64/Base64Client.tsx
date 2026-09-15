"use client";

import { useState } from "react";
import { ToolShell, CodeEditor, CopyButton } from "@/components/dev";

export function Base64Client() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const process = () => {
    setError("");
    try {
      if (mode === "encode") {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input))));
      }
    } catch {
      setError(mode === "encode" ? "Failed to encode" : "Invalid Base64");
      setOutput("");
    }
  };

  return (
    <ToolShell
      title="Base64 Encode / Decode"
      description="Encode or decode text to Base64. Runs 100% in your browser."
      actions={
        <>
          <CopyButton text={output} />
          <button
            type="button"
            onClick={() => { setInput(""); setOutput(""); setError(""); }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Clear
          </button>
        </>
      }
    >
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("encode")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            mode === "encode"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "border border-border text-muted-foreground"
          }`}
        >
          Encode
        </button>
        <button
          type="button"
          onClick={() => setMode("decode")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            mode === "decode"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "border border-border text-muted-foreground"
          }`}
        >
          Decode
        </button>
        <button
          type="button"
          onClick={process}
          className="ml-auto rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          {mode === "encode" ? "Encode" : "Decode"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Input</div>
          <CodeEditor value={input} onChange={setInput} rows={12} placeholder={mode === "encode" ? "Text to encode" : "Base64 to decode"} />
        </div>
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Output</div>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{error}</div>
          ) : (
            <CodeEditor value={output} readOnly rows={12} placeholder="Result" />
          )}
        </div>
      </div>
    </ToolShell>
  );
}
