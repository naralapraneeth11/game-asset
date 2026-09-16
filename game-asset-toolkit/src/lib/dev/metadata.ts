import type { Metadata } from "next";
import { developerTools } from "@/lib/tools";

/** Set NEXT_PUBLIC_SITE_URL for a custom domain. Vercel supplies its production host. */
export function siteOrigin(): URL | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured) return undefined;
  try {
    const url = new URL(configured.includes("://") ? configured : `https://${configured}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return new URL(url.origin);
  } catch { return undefined; }
}

export function developerMetadata(id: string): Metadata {
  const tool = developerTools.find((entry) => entry.id === id);
  if (!tool) throw new Error(`Unknown developer tool: ${id}`);
  const origin = siteOrigin();
  return {
    title: `${tool.name} — Free, Private, Online`,
    description: tool.description,
    keywords: [...tool.keywords, "developer tools", "local", "private", "free"],
    ...(origin ? { metadataBase: origin, alternates: { canonical: new URL(tool.href, origin) } } : {}),
    openGraph: { title: `${tool.name} · Game Asset Toolkit`, description: tool.description, type: "website", ...(origin ? { url: new URL(tool.href, origin) } : {}) },
  };
}

/** Back-compat alias used by older client pages. */
export function toolMetadata(toolId: string): Metadata {
  try { return developerMetadata(toolId); } catch { return { title: "Developer Tool" }; }
}
