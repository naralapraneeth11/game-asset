import type { ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The only place expert options live. Closed on load; the header summarizes
 * the current settings ("MP4 · H.264 · 1080p") so experts can see what will
 * happen without opening it.
 */
export function AdvancedPanel({ summary, children, title = "Advanced", className }: { summary?: ReactNode; children: ReactNode; title?: string; className?: string }) {
  return (
    <details className={cn("group rounded-2xl border border-border bg-card [&_summary::-webkit-details-marker]:hidden", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3.5 sm:px-5">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">{title}</span>
        {summary && <span className="min-w-0 flex-1 truncate text-right text-[13px] text-muted-foreground">{summary}</span>}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180", !summary && "ml-auto")} aria-hidden />
      </summary>
      <div className="border-t border-border px-4 py-5 sm:px-5">{children}</div>
    </details>
  );
}
