"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { categories, developerGroups, getDeveloperToolsByGroup, getToolsByCategory, popularTools, searchTools } from "@/lib/tools";
import { ToolCard } from "@/components/tool/ToolCard";
import { navigateToTool } from "@/components/shell/ToolLink";

/** Home page search box plus the tool directory it filters. */
export function HomeDirectory() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const results = useMemo(() => (query.trim() ? searchTools(query) : null), [query]);

  useEffect(() => {
    // Focus on load for mouse and trackpad users only; on phones it would pop the keyboard.
    if (window.matchMedia("(pointer: fine)").matches) input.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <form
        role="search"
        className="relative mx-auto mt-8 max-w-xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (results?.[0]) navigateToTool(results[0], router.push);
        }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }}
          placeholder="Search tools, e.g. compress video"
          aria-label="Search tools"
          autoComplete="off"
          spellCheck={false}
          className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-12 text-base shadow-card outline-none transition placeholder:text-muted-foreground focus-visible:outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--selection)] [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); input.current?.focus(); }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </form>

      <div className="mx-auto mt-14 max-w-[1200px] text-left">
        {results ? (
          <section aria-labelledby="results-heading">
            <h2 id="results-heading" className="mb-4 text-sm font-medium text-muted-foreground" aria-live="polite">
              {results.length ? `${results.length} ${results.length === 1 ? "tool" : "tools"} for “${query.trim()}”` : `No tools match “${query.trim()}”`}
            </h2>
            {results.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                Try a format or a job, such as “mp4”, “png”, “jwt” or “sprite”.
              </p>
            )}
          </section>
        ) : (
          <>
            <section aria-labelledby="popular-heading">
              <h2 id="popular-heading" className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Popular</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {popularTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
              </div>
            </section>

            <div className="mt-16 space-y-14">
              {categories.map((category) => {
                const list = getToolsByCategory(category.id);
                if (!list.length) return null;
                return (
                  <section key={category.id} aria-labelledby={`category-${category.id}`}>
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h2 id={`category-${category.id}`} className="text-lg font-semibold tracking-tight">{category.label}</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">{category.description}</p>
                      </div>
                      <Link href={category.href} aria-label={`All ${category.label} tools`} className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                        View all
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                    </div>
                    {category.id === "developer" ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {developerGroups.flatMap((group) => getDeveloperToolsByGroup(group)).map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
