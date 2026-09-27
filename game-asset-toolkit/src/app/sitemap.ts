import type { MetadataRoute } from "next";
import { categories, getToolsByCategory, tools } from "@/lib/tools";
import { absoluteUrl } from "@/lib/seo";

/** Home, the category hubs and every live tool. Hidden tools stay out until they work. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...categories
      .filter((category) => getToolsByCategory(category.id).length > 0)
      .map((category) => ({ url: absoluteUrl(category.href), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...tools.map((tool) => ({ url: absoluteUrl(tool.href), changeFrequency: "monthly" as const, priority: 0.9 })),
    ...["/about", "/privacy", "/licenses"].map((path) => ({ url: absoluteUrl(path), changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
