import Link from "next/link";
import { getDeveloperTools, developerGroups } from "@/lib/tools";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Developer Tools",
  description:
    "Private, local-first developer utilities: JSON formatter, JWT decoder, Base64, Hash, Regex and more. Files never leave your browser.",
};

export default function DeveloperToolsHub() {
  const tools = getDeveloperTools();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8">
      <div className="mb-2 text-[13px] text-muted-foreground">
        Local-first · 100% private
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Developer Tools</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Fast, private utilities that run entirely in your browser. No uploads,
        no accounts.
      </p>

      <div className="mt-10 space-y-8">
        {developerGroups.map((group) => {
          const groupTools = tools.filter((t) => t.group === group);
          if (groupTools.length === 0) return null;
          return (
            <div key={group}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group}
              </h2>
              <div className="space-y-2">
                {groupTools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 transition hover:border-neutral-300 hover:shadow-sm dark:hover:border-neutral-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                        <tool.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{tool.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
