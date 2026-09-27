import type { ReactNode } from "react";
import { Breadcrumb } from "./Breadcrumb";

/** Layout for plain text pages: About, Privacy, Licenses. */
export function ContentPage({ title, path, intro, children }: { title: string; path: string; intro?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-8">
      <Breadcrumb items={[{ name: "Home", href: "/" }, { name: title, href: path }]} />
      <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-pretty text-[17px] leading-relaxed text-muted-foreground">{intro}</p>}
      <div className="mt-10 space-y-10 text-[15px] leading-relaxed [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_section>*+*]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}
