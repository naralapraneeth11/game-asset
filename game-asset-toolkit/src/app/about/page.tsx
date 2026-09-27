import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/shell/ContentPage";
import { ogImage, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { categories } from "@/lib/tools";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: `${site.name} is a set of free browser tools for game and web developers, built by a game developer. Everything runs on your device and nothing uploads.`,
  path: "/about",
  image: ogImage("home", `About ${site.name}`),
});

export default function AboutPage() {
  return (
    <ContentPage title={`About ${site.name}`} path="/about" intro={site.tagline}>
      <section>
        <h2>Why this exists</h2>
        <p>
          Shipping a game means a lot of small, fiddly jobs: shrinking a trailer so it fits a store page, turning a logo into a dozen app
          icon sizes, packing sprites into an atlas, checking a JSON config at midnight. Most online tools for these jobs upload your files,
          add watermarks or hide the useful options behind an account.
        </p>
        <p>
          {site.name} does the work in your browser instead. Codecs such as FFmpeg, MozJPEG, libwebp and OxiPNG are compiled to
          WebAssembly and run on your own device, so your files never leave it.
        </p>
      </section>

      <section>
        <h2>How the tools are built</h2>
        <ul>
          <li>Every page asks one thing first: which file? Sensible defaults finish the job; expert options live under Advanced.</li>
          <li>Heavy work runs in background workers with memory limits, so the page stays responsive and large batches do not crash the tab.</li>
          <li>Nothing appears on the site until it works end to end. Tools in development stay hidden.</li>
        </ul>
      </section>

      <section>
        <h2>Tools</h2>
        <ul>
          {categories.map((category) => (
            <li key={category.id}><Link href={category.href}>{category.label}</Link>: {category.description.toLowerCase()}.</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Feedback and source</h2>
        <p>
          Found a bug or want a tool? <a href={site.feedback} rel="noopener">Open an issue on GitHub</a>. The source code is on{" "}
          <a href={site.repository} rel="noopener">GitHub</a>, and the open-source components are listed on the{" "}
          <Link href="/licenses">licenses page</Link>.
        </p>
      </section>
    </ContentPage>
  );
}
