import type { Metadata } from "next";
import { BadgeCheck, CloudOff, UserX } from "lucide-react";
import { site } from "@/lib/site";
import { homeSeo } from "@/lib/seo-copy";
import { ogImage, pageMetadata, serializeJsonLd, siteJsonLd } from "@/lib/seo";
import { HomeDirectory } from "@/components/home/HomeDirectory";

export const metadata: Metadata = pageMetadata({ title: homeSeo.title, description: homeSeo.description, path: "/", image: ogImage("home", site.name) });

const trust = [
  { icon: CloudOff, label: "No upload", detail: "Files are processed on your device" },
  { icon: UserX, label: "No sign-up", detail: "Open a tool and use it" },
  { icon: BadgeCheck, label: "Free", detail: "No watermarks, no limits per day" },
];

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteJsonLd()) }} />
      <section className="px-4 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{site.headline}</h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">{site.promise}</p>
        <HomeDirectory />
      </section>

      <section aria-label="Why use these tools" className="mt-20 px-4 sm:px-6 lg:px-8">
        <ul className="mx-auto grid max-w-[1200px] gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {trust.map((item) => (
            <li key={item.label} className="flex items-center gap-3.5 bg-card px-5 py-4">
              <item.icon className="h-5 w-5 shrink-0 text-[var(--ring)]" aria-hidden />
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-[13px] text-muted-foreground">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-[13px] text-muted-foreground">{site.tagline} The Image Compressor also works offline.</p>
      </section>
    </>
  );
}
