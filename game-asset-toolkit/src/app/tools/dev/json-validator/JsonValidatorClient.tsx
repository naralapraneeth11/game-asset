"use client";

import { useMemo, useState } from "react";
import { ToolShell, CodeEditor } from "@/components/dev";

export function JsonValidatorClient() {
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (!input.trim()) return { valid: null as boolean | null, message: "" };
    try {
      JSON.parse(input);
      return { valid: true, message: "Valid JSON" };
    } catch (e) {
      return {
        valid: false,
        message: e instanceof Error ? e.message : "Invalid JSON",
      };
    }
  }, [input]);

  return (
    <ToolShell
      title="JSON Validator"
      description="Check if your JSON is valid. Instant feedback, fully private."
    >
      <div className="mb-4">
        {result.valid === true && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            {result.message}
          </div>
        )}
        {result.valid === false && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {result.message}
          </div>
        )}
      </div>
      <CodeEditor
        value={input}
        onChange={setInput}
        rows={16}
        placeholder='Paste JSON here to validate...'
      />
    </ToolShell>
  );
}
