import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/shell/ContentPage";
import { ogImage, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: `How ${site.name} handles your data: files and text are processed in your browser and never uploaded. No accounts, no cookies and no analytics.`,
  path: "/privacy",
  image: ogImage("home", "Privacy"),
});

// Keep this page true. If analytics are ever added, they must be cookie-free, must never
// include file names or contents, and this page and the tools' About notes must say so.
export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy" path="/privacy" intro="Short version: your files stay on your device. We never see them.">
      <section>
        <h2>Your files and text</h2>
        <p>
          Every tool on {site.name} processes files and text inside your browser, using JavaScript, WebAssembly and web workers. Nothing you
          drop, paste or type is uploaded, logged or stored on a server. Closing the tab discards it.
        </p>
        <p>
          The video tools may keep exports in your browser&apos;s private storage (the origin private file system) until you save them or
          press Clear. The Image Compressor&apos;s optional offline mode caches the tool&apos;s own code and codecs, never your images.
        </p>
      </section>

      <section>
        <h2>What is stored in your browser</h2>
        <ul>
          <li>Your theme choice (light, dark or system), in local storage.</li>
          <li>Offline files for the Image Compressor, only if you choose Prepare for offline. You can remove them from the tool at any time.</li>
        </ul>
        <p>There are no accounts, no cookies and no advertising or analytics scripts.</p>
      </section>

      <section>
        <h2>Network requests</h2>
        <p>
          Pages, scripts, fonts and codecs are served from this site. The SVG tools contact another server only if an SVG links to external
          assets and you choose to load them; that request goes without cookies or a referrer. Like any website, the hosting provider keeps
          standard request logs, such as IP address and requested page, to operate and protect the service.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about privacy? <a href={site.feedback} rel="noopener">Open an issue on GitHub</a>. See also the{" "}
          <Link href="/licenses">open-source licenses</Link>.
        </p>
      </section>
    </ContentPage>
  );
}
