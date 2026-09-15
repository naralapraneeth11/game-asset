"use client";

import { cn } from "@/lib/utils";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  rows?: number;
  spellCheck?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  placeholder = "Paste content here…",
  readOnly = false,
  className,
  rows = 12,
  spellCheck = false,
}: CodeEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      rows={rows}
      spellCheck={spellCheck}
      className={cn(
        "w-full resize-y rounded-xl border border-border bg-muted/30 px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10",
        readOnly && "cursor-default opacity-90",
        className
      )}
    />
  );
}
