import Link from "next/link";
import { ArrowRight, Shield, Sparkles } from "lucide-react";
import { tools, getSuggestedTools } from "@/lib/tools";

export default function Home() {
  const suggested = getSuggestedTools();

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-8 py-16">
        {/* Status */}
        <div className="mb-4 inline-flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Local-first · Files never leave your browser
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
          Game Asset Toolkit
        </h1>

        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Clean, fast, private tools built for indie and professional game
          developers. Everything runs on your device.
        </p>

        {/* Suggested */}
        <div className="mt-10">
          <div className="mb-3 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider text-neutral-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Suggested
          </div>
          <div className="space-y-2.5">
            {suggested.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4 transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-neutral-900 dark:text-neutral-50">
                      {tool.name}
                    </div>
                    <div className="text-[13px] text-neutral-500 dark:text-neutral-400">
                      {tool.description}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
              </Link>
            ))}
          </div>
        </div>

        {/* All tools */}
        <div className="mt-10">
          <div className="mb-3 text-[12px] font-medium uppercase tracking-wider text-neutral-400">
            All Tools
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/60 px-4 py-3 transition hover:border-neutral-300 hover:bg-white dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
              >
                <tool.icon className="h-4 w-4 shrink-0 text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100" />
                <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300 truncate">
                  {tool.shortName}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 flex items-center gap-2 text-[13px] text-neutral-400 dark:text-neutral-500">
          <Shield className="h-3.5 w-3.5" />
          All processing happens on your device
        </div>
      </div>
    </div>
  );
}
