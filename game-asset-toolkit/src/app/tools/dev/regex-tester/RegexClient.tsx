"use client";

import { useMemo, useState } from "react";
import { ToolShell, CodeEditor } from "@/components/dev";

export function RegexClient() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");

  const result = useMemo(() => {
    if (!pattern) return { matches: [] as string[], error: "" };
    try {
      const re = new RegExp(pattern, flags);
      const matches = text.match(re) || [];
      return { matches, error: "" };
    } catch (e) {
      return { matches: [], error: e instanceof Error ? e.message : "Invalid regex" };
    }
  }, [pattern, flags, text]);

  return (
    <ToolShell title="Regex Tester" description="Test regular expressions with live match results.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Pattern"
          className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
        />
        <input
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          placeholder="Flags"
          className="w-20 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
        />
      </div>
      {result.error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {result.error}
        </div>
      )}
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Test String</div>
      <CodeEditor value={text} onChange={setText} rows={8} placeholder="Text to test against" />
      <div className="mt-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Matches ({result.matches.length})
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 font-mono text-sm">
          {result.matches.length === 0 ? (
            <span className="text-muted-foreground">No matches</span>
          ) : (
            <ul className="space-y-1">
              {result.matches.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
