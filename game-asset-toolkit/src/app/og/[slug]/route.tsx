import { ImageResponse } from "next/og";
import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { categories, getCategory, tools } from "@/lib/tools";
import { hubSeo } from "@/lib/seo-copy";
import { site } from "@/lib/site";
import { siteOrigin } from "@/lib/seo";
import { LOGO_PATH } from "@/components/shell/Logo";

/**
 * Share cards (1200 × 630) for every page, rendered once at build time:
 * /og/home, /og/<hub-slug> and /og/<tool-id>. Referenced from the
 * metadata helpers in src/lib/seo.ts.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return ["home", ...categories.map((category) => category.href.slice(1)), ...tools.map((tool) => tool.id)].map((slug) => ({ slug }));
}

type Card = { eyebrow: string; title: string; subtitle: string; icon: LucideIcon };

function card(slug: string): Card | null {
  if (slug === "home") return { eyebrow: site.tagline, title: site.headline, subtitle: site.promise, icon: Sparkles };
  const category = categories.find((entry) => entry.href.slice(1) === slug);
  if (category) return { eyebrow: `${site.name} · ${category.label}`, title: hubSeo[category.id].h1, subtitle: hubSeo[category.id].intro, icon: category.icon };
  const tool = tools.find((entry) => entry.id === slug);
  if (tool) return { eyebrow: getCategory(tool.category).label, title: tool.name, subtitle: tool.tagline, icon: tool.icon };
  return null;
}

/** Satori renders plain elements; unwrap lucide's forwardRef components into their <svg>. */
function plain(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map(plain);
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<{ children?: ReactNode; className?: string }>;
  const type = element.type as unknown;
  if (typeof type === "object" && type !== null && "render" in type) return plain((type as { render: (props: unknown, ref: null) => ReactNode }).render(element.props, null));
  if (typeof type === "function") return plain((type as (props: unknown) => ReactNode)(element.props));
  const props: Record<string, unknown> = { ...element.props, key: element.key ?? undefined };
  delete props.className;
  delete props.children;
  return createElement(type as string, props, element.props.children === undefined ? undefined : plain(element.props.children));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = card(slug);
  if (!content) return new Response("Not found", { status: 404 });
  const Icon = content.icon;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#1c1b1a", color: "#f2f1ee", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#FF6A00" />
            <path d={LOGO_PATH} fill="none" stroke="#160A00" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>{site.name}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 26, color: "#FF9045", marginBottom: 18 }}>{content.eyebrow}</div>
            <div style={{ fontSize: content.title.length > 28 ? 64 : 80, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{content.title}</div>
            <div style={{ fontSize: 32, color: "#aba8a2", marginTop: 24, lineHeight: 1.35 }}>{content.subtitle}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 220, height: 220, borderRadius: 48, background: "#242322", border: "2px solid #383735" }}>
            {plain(<Icon size={112} color="#FF6A00" strokeWidth={1.75} />)}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#8a8781" }}>
          <div style={{ display: "flex" }}>No upload · No sign-up · Free</div>
          <div style={{ display: "flex" }}>{siteOrigin().host}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
