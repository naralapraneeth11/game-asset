import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { ContentPage } from "@/components/shell/ContentPage";
import { ogImage, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Open-source licenses",
  description: `The open-source software inside ${site.name}'s browser tools, with licenses, notices and source links, including the GPL-licensed FFmpeg core.`,
  path: "/licenses",
  image: ogImage("home", "Open-source licenses"),
});

const licenseDir = path.join(process.cwd(), "src/tools/video-editor/licenses");
const read = (file: string) => fs.readFileSync(path.join(licenseDir, file), "utf8");

const components = [
  { name: "FFmpeg core (@ffmpeg/core, @ffmpeg/core-mt 0.12.10)", license: "GPL-2.0-or-later", source: "https://github.com/ffmpegwasm/ffmpeg.wasm", used: "Video tools, compatibility engine" },
  { name: "ffmpeg.wasm wrapper (@ffmpeg/ffmpeg 0.12.15)", license: "MIT", source: "https://github.com/ffmpegwasm/ffmpeg.wasm", used: "Video tools" },
  { name: "Mediabunny 1.56.3", license: "MPL-2.0", source: "https://github.com/Vanilagy/mediabunny", used: "Video tools, native engine" },
  { name: "jSquash codecs (MozJPEG, libwebp, libavif, OxiPNG, libjxl)", license: "Apache-2.0 and codec licenses", source: "https://github.com/jamsinclair/jSquash", used: "Image Compressor" },
  { name: "wasm-feature-detect 1.9.0", license: "Apache-2.0", source: "https://github.com/GoogleChromeLabs/wasm-feature-detect", used: "Image Compressor" },
  { name: "Comlink 4.4.2", license: "Apache-2.0", source: "https://github.com/GoogleChromeLabs/comlink", used: "Video tools" },
  { name: "fflate 0.8.2", license: "MIT", source: "https://github.com/101arrowz/fflate", used: "ZIP downloads" },
  { name: "Next.js, React", license: "MIT", source: "https://github.com/vercel/next.js", used: "The site" },
  { name: "Lucide icons", license: "ISC", source: "https://github.com/lucide-icons/lucide", used: "The site" },
  { name: "Geist and Geist Mono fonts", license: "OFL-1.1", source: "https://github.com/vercel/geist-font", used: "The site" },
];

const texts = [
  { title: "GNU General Public License v2 (FFmpeg core)", file: "ffmpeg-core-GPLv2.txt" },
  { title: "MIT License (ffmpeg.wasm wrapper)", file: "ffmpeg-wrapper-MIT.txt" },
  { title: "Mozilla Public License 2.0 (Mediabunny)", file: "mediabunny-MPL-2.0.txt" },
  { title: "Apache License 2.0 (Comlink)", file: "comlink-Apache-2.0.txt" },
  { title: "MIT License (fflate)", file: "fflate-MIT.txt" },
];

export default function LicensesPage() {
  return (
    <ContentPage
      title="Open-source licenses"
      path="/licenses"
      intro={`${site.name} is built on open-source software. This page lists what ships to your browser, under which license, and where to find the source.`}
    >
      <section>
        <h2>FFmpeg</h2>
        <p>
          The video tools fall back to FFmpeg compiled to WebAssembly when your browser cannot encode a format natively. The bundled FFmpeg
          core is licensed under the GNU General Public License, version 2 or later, and includes third-party codecs.
        </p>
        <ul>
          <li>FFmpeg source code: <a href="https://github.com/FFmpeg/FFmpeg" rel="noopener">github.com/FFmpeg/FFmpeg</a></li>
          <li>Source and build scripts for the WebAssembly cores (@ffmpeg/core 0.12.10): <a href="https://github.com/ffmpegwasm/ffmpeg.wasm" rel="noopener">github.com/ffmpegwasm/ffmpeg.wasm</a></li>
          <li>Questions about corresponding source for the exact build served here: <a href={site.feedback} rel="noopener">open an issue</a>.</li>
        </ul>
      </section>

      <section>
        <h2>Components</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-2.5 font-medium">Component</th><th className="px-4 py-2.5 font-medium">License</th><th className="px-4 py-2.5 font-medium">Used by</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {components.map((item) => (
                <tr key={item.name}>
                  <td className="px-4 py-3"><a href={item.source} rel="noopener" className="text-foreground">{item.name}</a></td>
                  <td className="px-4 py-3 text-muted-foreground">{item.license}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm">Codec license files for the Image Compressor are served with the codecs under <code className="font-mono text-[13px]">/tools/image-compressor/v2/codecs/</code>.</p>
      </section>

      <section>
        <h2>Third-party notices</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 font-mono text-xs leading-relaxed text-muted-foreground">{read("THIRD-PARTY-NOTICES.txt")}</pre>
      </section>

      <section>
        <h2>License texts</h2>
        <div className="divide-y divide-border rounded-2xl border border-border">
          {texts.map((text) => (
            <details key={text.file} className="group">
              <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium">{text.title}</summary>
              <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap border-t border-border px-5 py-4 font-mono text-xs leading-relaxed text-muted-foreground">{read(text.file)}</pre>
            </details>
          ))}
        </div>
      </section>
    </ContentPage>
  );
}
