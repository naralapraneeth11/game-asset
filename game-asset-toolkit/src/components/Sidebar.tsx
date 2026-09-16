"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Search,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "./SegmentedControl";
import { useTheme } from "@/lib/theme";
import {
  tools,
  categories,
  getSuggestedTools,
  searchTools,
  type ToolCategory,
} from "@/lib/tools";

type SidebarProps = {
  /** Rendered next to the logo — e.g. a collapse (desktop) or close (mobile) button. */
  controls?: ReactNode;
  /** Which shell context this instance is rendered in. Not required, but handy if you
   *  want mobile-only behavior later (autofocus search, different default-expanded groups, etc). */
  instance?: "desktop" | "mobile";
  /** Called when the user activates a nav link — wire this to close the mobile dialog. */
  onNavigate?: () => void;
};

function SidebarNav({
  controls,
  onNavigate,
}: Pick<SidebarProps, "controls" | "onNavigate">) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    image: true,
    sprite: true,
    "3d": true,
    developer: true,
  });

  const filtered = useMemo(() => searchTools(query), [query]);
  const suggested = useMemo(() => getSuggestedTools(), []);
  const isSearching = query.trim().length > 0;

  const toggleCategory = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between gap-2.5 px-3">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5"
          onClick={onNavigate}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 transition-transform group-hover:scale-105">
            <Layers className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight text-foreground truncate">
              Game Asset Toolkit
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Local-first · Private
            </div>
          </div>
        </Link>
        {controls}
      </div>

      {/* Search */}
      <div className="mt-5 px-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools..."
            className="w-full rounded-xl border border-border bg-muted/40 py-2 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 transition"
          />
        </div>
      </div>

      <nav className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4">
        {/* Suggested (only when not searching) */}
        {!isSearching && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 px-2.5 pb-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                Suggested
              </span>
            </div>
            <div className="space-y-0.5">
              {suggested.map((tool) => {
                const active = pathname === tool.href;
                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-all",
                      active
                        ? "bg-neutral-900 font-medium text-white shadow-sm dark:bg-white dark:text-neutral-900"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <tool.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{tool.shortName}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Search results or Categories */}
        {isSearching ? (
          <div className="space-y-0.5">
            <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              Results ({filtered.length})
            </p>
            {filtered.length === 0 ? (
              <p className="px-2.5 py-4 text-[13px] text-muted-foreground">
                No tools found
              </p>
            ) : (
              filtered.map((tool) => {
                const active = pathname === tool.href;
                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-all",
                      active
                        ? "bg-neutral-900 font-medium text-white shadow-sm dark:bg-white dark:text-neutral-900"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <tool.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <div className="truncate">{tool.shortName}</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        ) : (
          categories.map((cat) => {
            const catTools = tools.filter((t) => t.category === cat.id);
            if (catTools.length === 0 && cat.id === "developer") {
              // Show empty developer section as coming soon
              return (
                <div key={cat.id} className="mb-2">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80 hover:text-muted-foreground transition"
                  >
                    <span>{cat.label}</span>
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 transition-transform",
                        expanded[cat.id] && "rotate-90"
                      )}
                    />
                  </button>
                  {expanded[cat.id] && (
                    <p className="px-2.5 py-2 text-[12px] text-muted-foreground/60">
                      Coming soon — JSON, JWT, Base64...
                    </p>
                  )}
                </div>
              );
            }
            if (catTools.length === 0) return null;

            return (
              <div key={cat.id} className="mb-2">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80 hover:text-muted-foreground transition"
                >
                  <span>{cat.label}</span>
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform",
                      expanded[cat.id] && "rotate-90"
                    )}
                  />
                </button>
                {expanded[cat.id] && (
                  <div className="space-y-0.5 mt-0.5">
                    {catTools.map((tool) => {
                      const active = pathname === tool.href;
                      return (
                        <Link
                          key={tool.id}
                          href={tool.href}
                          aria-current={active ? "page" : undefined}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-all",
                            active
                              ? "bg-neutral-900 font-medium text-white shadow-sm dark:bg-white dark:text-neutral-900"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <tool.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{tool.shortName}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Theme */}
      <div className="border-t border-border px-3 pt-4">
        <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Appearance
        </p>
        <SegmentedControl
          layoutId="theme-switch"
          size="sm"
          value={theme}
          onChange={setTheme}
          className="w-full justify-between"
          options={[
            {
              value: "light",
              label: "Light",
              icon: <Sun className="h-3.5 w-3.5" />,
            },
            {
              value: "dark",
              label: "Dark",
              icon: <Moon className="h-3.5 w-3.5" />,
            },
            {
              value: "system",
              label: "System",
              icon: <Monitor className="h-3.5 w-3.5" />,
            },
          ]}
        />
      </div>
    </>
  );
}

export default function Sidebar({ controls, onNavigate }: SidebarProps) {
  // Layout chrome (the <aside>, mobile bar, and <dialog>) now lives in AppShell.tsx —
  // this component only renders the sidebar's content.
  return (
    <div className="flex h-full flex-col py-5">
      <SidebarNav controls={controls} onNavigate={onNavigate} />
    </div>
  );
}
