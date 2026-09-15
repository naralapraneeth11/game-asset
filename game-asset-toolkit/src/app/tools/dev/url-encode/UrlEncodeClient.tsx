"use client";

import { useState } from "react";
import { ToolShell, CodeEditor, CopyButton } from "@/components/dev";

export function UrlEncodeClient() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [output, setOutput] = useState("");

  const process = () => {
    try {
      setOutput(mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input));
    } catch {
      setOutput("Invalid input");
    }
  };

  return (
    <ToolShell title="URL Encode / Decode" description="Percent-encode or decode URL components." actions={<CopyButton text={output} />}>
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setMode("encode")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "encode" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border border-border"}`}>Encode</button>
        <button type="button" onClick={() => setMode("decode")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "decode" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border border-border"}`}>Decode</button>
        <button type="button" onClick={process} className="ml-auto rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900">Run</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CodeEditor value={input} onChange={setInput} rows={10} placeholder="Input" />
        <CodeEditor value={output} readOnly rows={10} placeholder="Output" />
      </div>
    </ToolShell>
  );
}
