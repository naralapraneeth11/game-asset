# Sprite Sheet Packer

Page: `/sprite-sheet-packer` (`src/app/sprite-sheet-packer/page.tsx`).

First screen: drop sprites → **Pack 48 sprites** → atlas preview with page count and fill %, **Download PNG + JSON** (a ZIP with
one PNG and one JSON per page; single files are one click away) and a Phaser / PixiJS loading snippet. Atlas size, padding,
extrusion, rotation, power of two, heuristic, alpha threshold and WebP output live in Advanced.

```
sprite-packer/
├── SpritePacker.tsx   UI on the shared DropZone / AdvancedPanel components
├── engine/index.ts    MaxRects packer v2.2.0 (BSSF/BAF/CP, alpha trim, extrusion, multi-page, pages trimmed to used area, TexturePacker JSON Hash)
└── README.md
```

## Engine API

```ts
import { createSpritePacker } from "@/tools/sprite-packer/engine";

const packer = createSpritePacker({ maxWidth: 2048, maxHeight: 2048, padding: 2, extrusion: 1 });
packer.onProgress(console.log);
const result = await packer.pack(files);
packer.destroy();
```

All processing is client-side. No uploads.
