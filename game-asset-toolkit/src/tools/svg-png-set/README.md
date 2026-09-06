# SVG → PNG Set Generator

Zero-server SVG to multi-resolution PNG bundles (Web / Apple / Android / Custom).

```
svg-png-set/
├── studio.spec.cjs   # Playwright acceptance suite
└── README.md
```

**App route:** `/tools/svg-png-set` (iframe → `/svg-to-png-studio.html`)

**Engine file:** place your production `svg-to-png-studio.html` at:

`game-asset-toolkit/public/svg-to-png-studio.html`

(Replace the temporary placeholder on `main`.)

## Capabilities (engine)
- Web: favicons, ICO, site.webmanifest
- Apple: iOS/macOS AppIcon.appiconset + Contents.json
- Android: mipmap densities + adaptive safe zone
- Custom sizes, alpha trim, padding, solid/transparent backgrounds
- SVG sanitization, linked-asset consent, worker + fallback, batch ZIP

Do not lightly rewrite the studio HTML — it is the tested production implementation.
