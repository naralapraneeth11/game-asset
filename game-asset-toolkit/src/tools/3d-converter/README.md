# 3D Model Converter (hidden)

Status: **hidden** in `src/lib/tools.ts`. The page `/3d-model-converter` renders in `npm run dev` with a banner and returns 404
in production. `ModelConverter.tsx` is a UI mockup: the inspection numbers (3 meshes, 12,480 triangles) are hard-coded and
nothing converts.

Before setting `status: "live"`:

- three.js loaders and exporters cover OBJ, STL, PLY and glTF/GLB in; glTF/GLB, OBJ, STL, PLY and USDZ out.
- Reading USD/USDZ is the hard part: launch without USD input.
- Once it works, give each common pair its own task page (OBJ to GLB, GLB to USDZ, STL to OBJ) with its own copy.
