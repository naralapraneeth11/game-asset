"use client";

import { useMemo, useState } from "react";
import { ToolShell, CodeEditor, OutputPanel, CopyButton } from "@/components/dev";

function tryFormat(input: string, indent: number): { ok: true; value: string } | { ok: false; error: string } {
  if (!input.trim()) return { ok: false, error: "" };
  try {
    const parsed = JSON.parse(input);
    return { ok: true, value: JSON.stringify(parsed, null, indent) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

function tryMinify(input: string): { ok: true; value: string } | { ok: false; error: string } {
  if (!input.trim()) return { ok: false, error: "" };
  try {
    const parsed = JSON.parse(input);
    return { ok: true, value: JSON.stringify(parsed) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

export function JsonFormatterClient() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState(2);
  const [mode, setMode] = useState<"beautify" | "minify">("beautify");

  const result = useMemo(() => {
    if (mode === "minify") return tryMinify(input);
    return tryFormat(input, indent);
  }, [input, indent, mode]);

  const output = result.ok ? result.value : "";
  const error = !result.ok ? result.error : "";

  return (
    <ToolShell
      title="JSON Formatter"
      description="Beautify, minify and validate JSON entirely in your browser. Nothing is uploaded."
      actions={
        <>
          <CopyButton text={output} />
          <button
            type="button"
            onClick={() => setInput("")}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Clear
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setMode("beautify")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              mode === "beautify"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Beautify
          </button>
          <button
            type="button"
            onClick={() => setMode("minify")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              mode === "minify"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Minify
          </button>
        </div>

        {mode === "beautify" && (
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Input
          </div>
          <CodeEditor
            value={input}
            onChange={setInput}
            placeholder='{"hello": "world"}'
            rows={16}
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Output
          </div>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : (
            <CodeEditor value={output} readOnly rows={16} placeholder="Formatted JSON will appear here" />
          )}
        </div>
      </div>
    </ToolShell>
  );
}
