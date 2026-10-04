import Link from "next/link";
import { popularTools } from "@/lib/tools";
import { ToolCard } from "@/components/tool/ToolCard";
import { buttonClass } from "@/components/tool/buttons";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pt-16 text-center sm:px-6">
      <p className="text-sm font-medium text-accent-text">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">This page does not exist</h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">It may have moved, or it is a tool that is not ready yet. Press / to search every tool, or start with one of these.</p>
      <Link href="/" className={buttonClass("primary", "lg", "mt-7")}>Browse all tools</Link>
      <div className="mt-14 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
        {popularTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
      </div>
    </div>
  );
}
