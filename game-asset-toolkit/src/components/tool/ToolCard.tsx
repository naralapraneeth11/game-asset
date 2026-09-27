import { ArrowUpRight } from "lucide-react";
import type { Tool } from "@/lib/tools";
import { ToolLink } from "@/components/shell/ToolLink";
import { cn } from "@/lib/utils";

/** Icon, tool name, and one line naming the job. */
export function ToolCard({ tool, className }: { tool: Tool; className?: string }) {
  return (
    <ToolLink
      tool={tool}
      className={cn(
        "group relative flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-border-strong hover:shadow-card",
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-primary-soft group-hover:text-[var(--ring)]">
        <tool.icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 pr-4">
        <span className="block text-[15px] font-medium leading-snug text-foreground">{tool.name}</span>
        <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">{tool.tagline}</span>
      </span>
      <ArrowUpRight className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </ToolLink>
  );
}
