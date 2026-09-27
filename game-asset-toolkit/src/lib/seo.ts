import "server-only";
import type { Metadata } from "next";
import { site } from "./site";
import { getCategory, getTool, type Tool, type ToolCategory, type ToolId } from "./tools";
import { hubSeo, toolSeo } from "./seo-copy";

/**
 * The canonical origin. Set NEXT_PUBLIC_SITE_URL to the one host you serve
 * (apex or www) and redirect the other in Vercel. Vercel supplies its
 * production host as a fallback; local builds use localhost.
 */
export function siteOrigin(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) {
    try {
      const url = new URL(configured.includes("://") ? configured : `https://${configured}`);
      if (url.protocol === "https:" || url.protocol === "http:") return new URL(url.origin);
    } catch {
      // Fall through to the local default.
    }
  }
  return new URL(`http://localhost:${process.env.PORT || 3000}`);
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteOrigin()).href;
}

/** Share-card image for a page, drawn by src/app/og/[slug]/route.tsx. */
export function ogImage(slug: string, alt: string) {
  return { url: `/og/${slug}`, width: 1200, height: 630, alt };
}

/** Shared metadata shape for every page: canonical, Open Graph and Twitter card. */
export function pageMetadata({ title, description, path, image, noindex = false }: {
  title: string;
  description: string;
  path: string;
  image: { url: string; width: number; height: number; alt: string };
  noindex?: boolean;
}): Metadata {
  const shareTitle = path === "/" ? title : `${title} | ${site.name}`;
  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: site.name, locale: site.locale, url: path, title: shareTitle, description, images: [image] },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: [image.url] },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function toolMetadata(id: ToolId): Metadata {
  const tool = getTool(id);
  const seo = toolSeo[id];
  return pageMetadata({
    title: seo.title,
    description: seo.description,
    path: tool.href,
    image: ogImage(id, tool.name),
    noindex: tool.status !== "live",
  });
}

export function hubMetadata(id: ToolCategory): Metadata {
  const category = getCategory(id);
  const seo = hubSeo[id];
  return pageMetadata({ title: seo.title, description: seo.description, path: category.href, image: ogImage(category.href.slice(1), seo.h1) });
}

type JsonLd = Record<string, unknown>;

function breadcrumbList(items: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

const applicationCategory: Record<ToolCategory, string> = {
  image: "MultimediaApplication",
  video: "MultimediaApplication",
  "game-dev": "DeveloperApplication",
  developer: "DeveloperApplication",
};

/** WebApplication + BreadcrumbList for a tool page. */
export function toolJsonLd(tool: Tool): JsonLd {
  const category = getCategory(tool.category);
  const seo = toolSeo[tool.id];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: tool.name,
        url: absoluteUrl(tool.href),
        description: seo.description,
        applicationCategory: applicationCategory[tool.category],
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript and a modern browser.",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: site.name, url: absoluteUrl("/") },
      },
      breadcrumbList([
        { name: "Home", path: "/" },
        { name: category.label, path: category.href },
        { name: tool.name, path: tool.href },
      ]),
    ],
  };
}

/** CollectionPage + BreadcrumbList for a category hub. */
export function hubJsonLd(id: ToolCategory, tools: readonly Tool[]): JsonLd {
  const category = getCategory(id);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: hubSeo[id].h1,
        url: absoluteUrl(category.href),
        description: hubSeo[id].description,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: tools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: absoluteUrl(tool.href) })),
        },
      },
      breadcrumbList([
        { name: "Home", path: "/" },
        { name: category.label, path: category.href },
      ]),
    ],
  };
}

/** WebSite for the home page. */
export function siteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: absoluteUrl("/"),
    description: site.description,
  };
}

/** Serialize for a <script type="application/ld+json">, safe against `</script>` in strings. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
