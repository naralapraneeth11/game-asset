"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { getCategory, searchTools, type Tool } from "@/lib/tools";
import { navigateToTool } from "./ToolLink";

/** ⌘K / Ctrl K search over the tool registry. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchTools(query), [query]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setQuery("");
      setActive(0);
      element.showModal();
      input.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (tool: Tool) => {
    onClose();
    navigateToTool(tool, router.push);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    const last = results.length - 1;
    const next =
      event.key === "ArrowDown" ? (active >= last ? 0 : active + 1)
      : event.key === "ArrowUp" ? (active <= 0 ? last : active - 1)
      : event.key === "Home" && event.ctrlKey ? 0
      : event.key === "End" && event.ctrlKey ? last
      : -1;
    if (next >= 0) {
      event.preventDefault();
      setActive(next);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[Math.min(active, last)]);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-label="Search tools"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-0 mx-auto mt-[12vh] w-[min(640px,calc(100vw-32px))] max-w-none overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-card backdrop:bg-[var(--overlay)] backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-results`}
          aria-activedescendant={results.length ? `${id}-option-${active}` : undefined}
          aria-autocomplete="list"
          aria-label="Search tools"
          placeholder="Search tools… e.g. compress video, jwt, sprite"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground sm:block">Esc</kbd>
      </div>
      <ul ref={list} id={`${id}-results`} role="listbox" aria-label="Tools" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
        {results.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground" role="presentation">
            No tools match “{query}”.
          </li>
        )}
        {results.map((tool, index) => (
          <li
            key={tool.id}
            id={`${id}-option-${index}`}
            data-index={index}
            role="option"
            aria-selected={index === active}
            onMouseMove={() => { if (index !== active) setActive(index); }}
            onClick={() => go(tool)}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 aria-selected:bg-hover"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground">
              <tool.icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{tool.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{tool.tagline}</span>
            </span>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{getCategory(tool.category).label}</span>
            {index === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
        <span><kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to move</span>
        <span><kbd className="font-sans">Enter</kbd> to open</span>
        <span className="ml-auto">{results.length} {results.length === 1 ? "tool" : "tools"}</span>
      </div>
    </dialog>
  );
}
