import Link from "next/link";
import { categories } from "@/lib/tools";
import { site } from "@/lib/site";
import { LogoMark } from "./Logo";

const siteLinks = [
  { name: "About", href: "/about" },
  { name: "Privacy", href: "/privacy" },
  { name: "Open-source licenses", href: "/licenses" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg">
            <LogoMark size={26} />
            <span className="text-sm font-semibold tracking-[0.08em]">{site.name}</span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{site.tagline} {site.promise}</p>
          <p className="mt-4 text-xs text-muted-foreground">No upload · No sign-up · Free</p>
        </div>
        <nav aria-label="Tool categories">
          <h2 className="eyebrow">Tools</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={category.href} className="text-foreground/80 hover:text-foreground">{category.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Site">
          <h2 className="eyebrow">{site.name}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {siteLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-foreground/80 hover:text-foreground">{link.name}</Link>
              </li>
            ))}
            <li><a href={site.feedback} className="text-foreground/80 hover:text-foreground" rel="noopener">Feedback</a></li>
            <li><a href={site.repository} className="text-foreground/80 hover:text-foreground" rel="noopener">GitHub</a></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
