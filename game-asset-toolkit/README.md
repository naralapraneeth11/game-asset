# RUYIX: free browser tools for game and web developers

Compress video and images, pack sprite sheets, turn SVG into PNGs, favicons and app icons, and format JSON, with everything
running in the browser. Files never upload: codecs such as FFmpeg, MozJPEG, libwebp, libavif and OxiPNG are compiled to
WebAssembly and run in workers on the visitor's device.

Built with Next.js 15, React 19, TypeScript and Tailwind CSS. The brand name lives in one place: `src/lib/site.ts`.

## Quick start

```bash
npm install        # also prepares the image and video codec assets
npm run dev        # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run build` | Prepares codec assets, builds, then writes the Image Compressor's offline manifest |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm test` | Image Compressor engine tests + SEO copy checks |
| `npm run check:seo` | Title ≤ 45 chars, description 140–160, 3–4 steps, 4–6 FAQs, no repeated paragraphs |

## Tools

20 live tools, 2 hidden until their engines ship. Short, flat URLs: the slug is the search phrase.

| Category (hub) | Tools |
| --- | --- |
| Image & Icons (`/image-tools`) | `/image-compressor`, `/svg-to-png`, `/favicon-generator`, `/app-icon-generator` |
| Video (`/video-tools`) | `/video-compressor`, `/video-converter`, `/video-to-gif`, `/video-editor` |
| Game Dev (`/game-dev-tools`) | `/sprite-sheet-packer`; hidden: `/1x-2x-3x-image-generator`, `/3d-model-converter` |
| Developer (`/developer-tools`) | `/json-formatter`, `/json-validator`, `/base64-encode-decode`, `/url-encode-decode`, `/jwt-decoder`, `/hash-generator`, `/password-generator`, `/uuid-generator`, `/unix-timestamp-converter`, `/regex-tester`, `/color-converter` |

Hidden tools are off navigation, search and the sitemap, render with a banner in `npm run dev`, and return 404 in production.
The rule: nothing visible on the site pretends to work.

## How it fits together

```
src/
  app/
    layout.tsx                 metadataBase, "%s | RUYIX" title template, top bar, footer
    page.tsx                   Home: hero, search, popular tools, all tools by category
    sitemap.ts  robots.ts      Generated from the registry (live tools only)
    icon.svg  apple-icon.tsx   Brand mark
    og/[slug]/route.tsx        Share cards for every page, rendered at build time
    <hub>/page.tsx             image-tools, video-tools, game-dev-tools, developer-tools
    <tool-id>/page.tsx         One folder per tool, a few lines each
    about/ privacy/ licenses/  Site pages; /licenses publishes the FFmpeg notices and source links
  components/
    shell/                     TopBar (Tools menu, ⌘K search, theme), CommandPalette, Breadcrumb, Footer
    tool/                      ToolPage, DropZone, PresetPicker, AdvancedPanel, ResultList, ToolCard, CategoryHub
  lib/
    tools.ts                   The registry: every tool's name, category, status and search words
    seo-copy.ts                Server-only titles, descriptions, H1, intro, steps and FAQ for every page
    seo.ts                     toolMetadata(), hubMetadata(), JSON-LD, siteOrigin()
    routes.ts                  Video routes that need COOP/COEP, and 301s from old URLs
    site.ts                    Brand name, tagline and links
  tools/<tool-id>/             UI + engine + README for each tool
```

Every tool page uses the same template (`ToolPage`): breadcrumb and H1 → the tool (drop zone, at most three presets, one primary
button labeled with the job, results that show the savings, one collapsed Advanced panel) → how-to, privacy note and FAQ → related
tools. The copy, metadata, canonical URL, Open Graph card and `WebApplication` + `BreadcrumbList` structured data all come from the
registry, so a new tool gets full SEO by filling in two objects.

### Adding tool #23

1. Add an entry to `src/lib/tools.ts`. The `id` is the URL slug; use the phrase people search for.
2. Add its copy to `toolSeo` in `src/lib/seo-copy.ts` (TypeScript fails the build until you do) and run `npm run check:seo`.
3. Put the UI and engine in `src/tools/<id>/` with a short README.
4. Create `src/app/<id>/page.tsx`:

   ```tsx
   import { toolMetadata } from "@/lib/seo";
   import { ToolPage } from "@/components/tool/ToolPage";
   import MyTool from "@/tools/my-tool/MyTool";

   export const metadata = toolMetadata("my-tool");

   export default function Page() {
     return <ToolPage id="my-tool"><MyTool /></ToolPage>;
   }
   ```

Start new tools with `status: "hidden"` and flip to `"live"` once they work end to end.

## Things to keep in sync

- **Video isolation headers.** FFmpeg runs multi-threaded only with COOP/COEP. Every video page must be in `VIDEO_ROUTES`
  (`src/lib/routes.ts`) and marked `isolated: true` in the registry, so links to it use a full page load.
- **Image Compressor offline mode.** The service worker scope (`Offline.tsx`) and `ROUTE` (`engine/offline-sw.js`) must match the
  page path.
- **Renamed or removed URLs.** After launch, every change needs a 301 in `LEGACY_REDIRECTS` (`src/lib/routes.ts`).
- **Colors.** `src/app/globals.css` is the only source of color. The brand orange (`--brand`, `--primary`) is used for primary
  buttons (with near-black text for contrast), focus rings (`--ring`) and the logo.
- **Privacy claims.** The site says it has no analytics and no cookies. If you add cookie-free page-view analytics, update
  `/privacy`, the SVG tool's About notes and `src/tools/developer/README.md`, and never send file names or contents.

## Deploy

1. Import the repository in Vercel and set the root directory to `game-asset-toolkit`.
2. Pick one host (apex or `www`), redirect the other in Vercel, and set `NEXT_PUBLIC_SITE_URL` to it. Canonical URLs, the sitemap,
   robots.txt and share cards use it; without it, Vercel's production URL is used.
3. Test every page in PageSpeed Insights (aim for green on mobile). FFmpeg and codec WebAssembly load only after a file is dropped.
4. On launch day, verify the domain in Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml`.

## Licenses

The video tools bundle the GPL-licensed FFmpeg core. Its notices, the license texts of every bundled component and the source
links are published at `/licenses` from `src/tools/video-editor/licenses/`.
