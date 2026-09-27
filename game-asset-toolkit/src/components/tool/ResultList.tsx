"use client";

import type { ReactNode } from "react";
import { ArrowRight, Download, LoaderCircle } from "lucide-react";
import { formatBytes, percentSaved } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonClass } from "./buttons";

export interface ResultItem {
  id: string;
  name: string;
  before: number;
  after: number;
  /** Extra facts, such as "1280 × 720 · 0:42". */
  detail?: ReactNode;
  warnings?: readonly string[];
  /** Row-level actions besides Download, such as Share. */
  actions?: ReactNode;
  onDownload: () => void;
}

function Saved({ before, after, className }: { before: number; after: number; className?: string }) {
  const saved = percentSaved(before, after);
  if (!before) return null;
  return saved >= 0.5
    ? <span className={cn("font-medium text-[var(--success)]", className)}>{saved.toFixed(0)}% smaller</span>
    : saved <= -0.5
      ? <span className={cn("font-medium text-[var(--warning)]", className)}>{Math.abs(saved).toFixed(0)}% larger</span>
      : <span className={cn("text-muted-foreground", className)}>About the same size</span>;
}

/**
 * Results show the win: original size, new size, percent saved, and one big
 * Download button (a ZIP when there is more than one file).
 */
export function ResultList({ items, onDownloadAll, downloadAllBusy, footer, title = "Done", compare = true }: {
  items: readonly ResultItem[];
  onDownloadAll?: () => void;
  downloadAllBusy?: boolean;
  footer?: ReactNode;
  title?: string;
  /** Show original → new size and percent saved. Off for jobs where size is not the goal, such as making a GIF. */
  compare?: boolean;
}) {
  if (!items.length) return null;
  const before = items.reduce((sum, item) => sum + item.before, 0);
  const after = items.reduce((sum, item) => sum + item.after, 0);
  const single = items.length === 1;

  return (
    <section aria-label="Results" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-b border-border px-5 py-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          {compare ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xl font-semibold tracking-tight tabular-nums">
              <span className="text-muted-foreground line-through decoration-1">{formatBytes(before)}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="sr-only">to</span>
              <span>{formatBytes(after)}</span>
              <Saved before={before} after={after} className="text-base" />
            </p>
          ) : (
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{single ? items[0].name : `${items.length} files`} · {formatBytes(after)}</p>
          )}
        </div>
        {single ? (
          <button type="button" className={buttonClass("primary", "lg")} onClick={items[0].onDownload}>
            <Download className="h-4 w-4" aria-hidden />Download
          </button>
        ) : onDownloadAll && (
          <button type="button" className={buttonClass("primary", "lg")} onClick={onDownloadAll} disabled={downloadAllBusy}>
            {downloadAllBusy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            Download all (ZIP)
          </button>
        )}
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground tabular-nums">
                {compare ? <><span>{formatBytes(item.before)} → {formatBytes(item.after)}</span><Saved before={item.before} after={item.after} /></> : <span>{formatBytes(item.after)}</span>}
                {item.detail && <span>· {item.detail}</span>}
              </p>
              {item.warnings?.map((warning) => <p key={warning} className="mt-1 text-xs text-muted-foreground">{warning}</p>)}
            </div>
            <div className="flex items-center gap-1.5">
              {item.actions}
              {!single && (
                <button type="button" className={buttonClass("secondary", "sm")} onClick={item.onDownload} aria-label={`Download ${item.name}`}>
                  <Download className="h-3.5 w-3.5" aria-hidden />Download
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {footer && <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{footer}</div>}
    </section>
  );
}
