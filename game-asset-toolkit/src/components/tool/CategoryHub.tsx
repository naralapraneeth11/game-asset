import { developerGroups, getCategory, getDeveloperToolsByGroup, getToolsByCategory, type ToolCategory } from "@/lib/tools";
import { hubSeo } from "@/lib/seo-copy";
import { hubJsonLd, serializeJsonLd } from "@/lib/seo";
import { Breadcrumb } from "@/components/shell/Breadcrumb";
import { ToolCard } from "./ToolCard";

/** A category landing page: "video tools online" and "developer tools online" are real searches. */
export function CategoryHub({ id }: { id: ToolCategory }) {
  const category = getCategory(id);
  const seo = hubSeo[id];
  const list = getToolsByCategory(id);
  const groups = id === "developer"
    ? developerGroups.map((group) => ({ name: group as string, tools: getDeveloperToolsByGroup(group) })).filter((group) => group.tools.length)
    : [{ name: "", tools: list }];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(hubJsonLd(id, list)) }} />
      <header className="pt-6 sm:pt-8">
        <Breadcrumb items={[{ name: "Home", href: "/" }, { name: category.label, href: category.href }]} />
        <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] sm:text-4xl">{seo.h1}</h1>
        <p className="mt-3 max-w-2xl text-pretty text-[17px] leading-relaxed text-muted-foreground">{seo.intro}</p>
      </header>

      <div className="mt-10 space-y-10">
        {groups.map((group) => (
          <section key={group.name || "all"} aria-label={group.name || `${category.label} tools`}>
            {group.name && <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.name}</h2>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-20 max-w-3xl space-y-12">
        <section className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
          {seo.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
        <section aria-labelledby="hub-faq">
          <h2 id="hub-faq" className="text-xl font-semibold tracking-tight">Questions</h2>
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
    </div>
  );
}
