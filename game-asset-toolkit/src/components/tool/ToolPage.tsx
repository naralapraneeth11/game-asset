import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CloudOff, ShieldCheck, WifiOff } from "lucide-react";
import { getCategory, getRelatedTools, getTool, type ToolId } from "@/lib/tools";
import { privacyNote, toolSeo } from "@/lib/seo-copy";
import { serializeJsonLd, toolJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/shell/Breadcrumb";
import { ToolCard } from "./ToolCard";

const widths = { narrow: "max-w-[1000px]", default: "max-w-[1200px]", wide: "max-w-[1400px]" } as const;

/**
 * The one template every tool uses, top to bottom: breadcrumb and header,
 * the tool itself (drop zone, presets, primary button, results, Advanced),
 * then how-to, privacy note and FAQ, then related tools. Everything except
 * the tool UI comes from the registry and src/lib/seo-copy.ts.
 */
export function ToolPage({ id, children, width = "default" }: { id: ToolId; children: ReactNode; width?: keyof typeof widths }) {
  const tool = getTool(id);
  if (tool.status !== "live" && process.env.NODE_ENV === "production") notFound();
  const category = getCategory(tool.category);
  const seo = toolSeo[id];
  const related = getRelatedTools(id);
  const container = cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[width]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(toolJsonLd(tool)) }} />
      <div className={container}>
        {tool.status !== "live" && (
          <p role="note" className="mt-4 rounded-xl border border-dashed border-[var(--warning)] px-4 py-3 text-sm text-warning">
            Hidden tool: off navigation and the sitemap, and returns 404 in production until its engine ships.
          </p>
        )}
        <header className="pt-6 sm:pt-8">
          <Breadcrumb items={[{ name: "Home", href: "/" }, { name: category.label, href: category.href }, { name: tool.name, href: tool.href }]} />
          <h1 className="mt-4 text-balance text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">{seo.h1}</h1>
          <p className="mt-2.5 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">{seo.intro}</p>
          <ul className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label="Privacy">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1"><CloudOff className="h-3.5 w-3.5" aria-hidden />No upload</li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />Runs in your browser</li>
            {tool.offline && <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1"><WifiOff className="h-3.5 w-3.5" aria-hidden />Works offline</li>}
          </ul>
        </header>
        <div className="mt-7">{children}</div>
      </div>

      <div className={cn(container, "mt-20")}>
        <div className="max-w-3xl space-y-14">
          <section aria-labelledby="how-to">
            <h2 id="how-to" className="text-xl font-semibold tracking-tight">How to use the {tool.name}</h2>
            <ol className="mt-5 space-y-3">
              {seo.steps.map((step, index) => (
                <li key={step} className="flex gap-3.5 text-[15px] leading-relaxed">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums" aria-hidden>{index + 1}</span>
                  <span className="pt-px">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="privacy" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 id="privacy" className="flex items-center gap-2 text-base font-semibold"><ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden />Private by design</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{privacyNote}</p>
          </section>

          <section aria-labelledby="faq">
            <h2 id="faq" className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {seo.faq.map((item) => (
                <div key={item.q} className="py-5">
                  <h3 className="text-[15px] font-medium">{item.q}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related" className="mt-16">
            <h2 id="related" className="text-xl font-semibold tracking-tight">Related tools</h2>
            <div className={cn("mt-5 grid gap-3 sm:grid-cols-2", width !== "narrow" && "lg:grid-cols-4")}>
              {related.map((item) => <ToolCard key={item.id} tool={item} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
