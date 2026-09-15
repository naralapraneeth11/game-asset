"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OutputPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function OutputPanel({
  title = "Output",
  children,
  className,
  emptyMessage = "Result will appear here",
  isEmpty = false,
}: OutputPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="flex-1 p-4">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
