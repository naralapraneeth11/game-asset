import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-8 py-16">
        <div className="mb-3 inline-flex items-center gap-2 text-[13px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Local-first · Files never leave your browser
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Game Asset Toolkit
        </h1>

        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-neutral-500">
          Clean, fast conversion tools built for indie and professional game
          developers. Start with the most-used tool or pick from the sidebar.
        </p>

        <div className="mt-10">
          <Link
            href="/tools/1x-2x-3x-converter"
            className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 transition hover:border-neutral-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[15px] font-medium text-neutral-900">
                  1x / 2x / 3x Image Scaler
                </div>
                <div className="text-[13px] text-neutral-500">
                  High-quality and pixel-art modes · Correct naming · ZIP export
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-700" />
          </Link>
        </div>

        <div className="mt-12 flex items-center gap-2 text-[13px] text-neutral-400">
          <Shield className="h-3.5 w-3.5" />
          All processing happens on your device
        </div>
      </div>
    </div>
  );
}
