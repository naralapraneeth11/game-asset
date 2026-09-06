# SVG → PNG Set Generator

Zero-server SVG to multi-resolution PNG bundles (Web / Apple / Android / Custom).

```
svg-png-set/
├── studio.html       # Production single-file engine + UI (v1.0.0)
├── studio.spec.cjs   # Playwright acceptance suite
└── README.md
```

**Runtime path:** served from `/svg-to-png-studio.html` (copied to `public/`).

**App route:** `/tools/svg-png-set` embeds the studio full-bleed in the toolkit shell.

## Capabilities
- Web: favicons, ICO, site.webmanifest
- Apple: iOS/macOS AppIcon.appiconset + Contents.json
- Android: mipmap densities + adaptive safe zone
- Custom sizes, alpha trim, padding, solid/transparent backgrounds
- SVG sanitization (scripts/handlers stripped)
- Linked assets only after explicit user consent
- Worker + OffscreenCanvas with main-thread fallback
- Batch ZIP, cancel, local-only (no upload)

Do not lightly rewrite `studio.html` — it is the tested production implementation.
