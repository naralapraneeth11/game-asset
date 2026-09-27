import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { Tool } from "@/lib/tools";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { tool: Pick<Tool, "href" | "isolated">; children: ReactNode };

/**
 * Link to a tool page. Isolated tools (the video pages) need COOP/COEP
 * response headers, which only arrive with a full document load, so they get
 * a plain anchor instead of client-side navigation.
 */
export function ToolLink({ tool, children, ...props }: Props) {
  if (tool.isolated) return <a href={tool.href} {...props}>{children}</a>;
  return <Link href={tool.href} {...props}>{children}</Link>;
}

/** Navigate programmatically with the same rule as ToolLink. */
export function navigateToTool(tool: Pick<Tool, "href" | "isolated">, push: (href: string) => void) {
  if (tool.isolated) window.location.assign(tool.href);
  else push(tool.href);
}
