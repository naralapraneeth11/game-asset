# Sprite Packer

Owned tool module for Game Asset Toolkit.

```
sprite-packer/
├── engine/
│   └── index.ts    # MaxRects BSSF packer v2.1.1 (alpha trim, extrusion, multi-page, TexturePacker JSON)
└── README.md
```

UI lives at `src/components/SpritePacker.tsx` and route at `src/app/tools/sprite-packer/`.

## Engine API

```ts
import { createSpritePacker } from "@/tools/sprite-packer/engine";

const packer = createSpritePacker({ maxWidth: 2048, padding: 2, extrusion: 1 });
packer.onProgress(console.log);
const result = await packer.pack(files);
await packer.download(result);
packer.destroy();
```

All processing is client-side. No uploads.
