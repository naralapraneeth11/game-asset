# SVG to PNG engine

One engine, three pages. Each page passes a starting preset to the embedded converter:

| Page | Preset |
| --- | --- |
| `/svg-to-png` | `custom` (your exact sizes) |
| `/favicon-generator` | `web` (PNG favicons, multi-size favicon.ico, touch and maskable icons, site.webmanifest, HTML snippet) |
| `/app-icon-generator` | `apple` (iOS/iPadOS and macOS AppIcon.appiconset); Android is one click away |

```
src/tools/svg-png-set/
├── SvgPngSet.tsx     Theme, font, viewport and iframe sizing; `preset` prop → ?preset=
├── studio.spec.cjs   Engine acceptance suite
└── README.md
public/svg-to-png-studio.html  Self-contained converter UI and local engine
```

The HTML reads `?preset=web|apple|android|custom` on load and Reset returns to that preset. It carries
`<meta name="robots" content="noindex, indexifembedded">`, so the bare file never ranks on its own; its content is indexed as part
of the pages that embed it.

`SvgPngSet.tsx` reads `resolvedTheme` from the shared theme provider and copies the app's color tokens into the same-origin
iframe, so theme changes do not reload it or discard loaded SVGs. A `ResizeObserver` sizes the frame to its content, and host
viewport offsets (including the 56 px sticky top bar) keep native dialogs and toasts visible.

Later: port the converter to React components so it shares the page template directly, without the iframe bridge. Keep renderer
changes separate from presentation updates and run the acceptance suite when changing conversion behavior.
