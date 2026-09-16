import type { Metadata } from "next";
import { tools } from "@/lib/tools";

export function toolMetadata(toolId: string): Metadata {
  const tool = tools.find((t) => t.id === toolId);
  if (!tool) {
    return { title: "Developer Tool" };
  }
  return {
    title: tool.name,
    description: tool.description,
    keywords: tool.keywords,
  };
}
