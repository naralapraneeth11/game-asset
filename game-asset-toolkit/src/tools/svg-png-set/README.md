# SVG to PNG Set

The SVG converter is part of Game Asset Toolkit at `/tools/svg-png-set`.

```
src/tools/svg-png-set/
├── SvgPngSet.tsx     # App theme, font, viewport, and iframe sizing integration
├── studio.spec.cjs   # Existing engine acceptance suite
└── README.md
public/svg-to-png-studio.html  # Self-contained converter UI and local engine
```

## App integration

The route owns the tool heading, SEO metadata, and the same `max-w-4xl` container
used by the other tools. The embedded converter begins with its source/settings
panels; it has no independent product name, navigation, or marketing header.

`SvgPngSet.tsx` reads `resolvedTheme` from the shared theme provider. Because the
iframe is same-origin, it updates the embedded document's theme and shared CSS
tokens directly. Theme changes do not reload the iframe or discard loaded SVGs.
Only the app's same-origin font-face rules are copied, reusing self-hosted Geist
assets without bringing the host stylesheet into the converter. The HTML CSP
allows same-origin fonts and data fonts; it does not load third-party UI assets.

A `ResizeObserver` measures the converter root's intrinsic height so the host
page scrolls normally and the frame can grow or shrink. Host viewport offsets
keep native dialogs and download toasts within the visible page area. Observers,
scroll listeners, and animation callbacks are removed when the tool unmounts.

Tailwind uses `darkMode: "class"` to follow the existing `html.dark` theme provider
instead of the OS media query alone. Its content scan includes `src/tools` so
tool-owned components receive their utility styles.

## Conversion behavior

The existing SVG parsing, rasterization, worker fallback, alpha trimming, safe
zones, and ZIP engine are retained. Web, Apple, Android, and custom presets,
batch input, individual PNG downloads, and explicit linked-asset consent remain
available. The UI theme does not alter exported backgrounds or SVG artwork.

The standalone HTML follows the shared `theme` preference (or system theme) when
opened outside the app. It remains usable without a server for self-contained
SVGs. Keep renderer changes separate from presentation updates and run the
existing engine acceptance suite when changing conversion behavior.
