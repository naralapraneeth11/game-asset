# universal3d

A **local-only** 3D asset converter. Point it at a file on your machine, get a converted file back on your machine. Nothing crosses the network.

See `ARCHITECTURE.md` for how the privacy guarantee is enforced in code.

## Supported today

| Direction | Formats |
|-----------|---------|
| **Import** | `.obj` `.stl` `.ply` `.gltf` `.glb` |
| **Export** | `.obj` `.stl` `.ply` `.gltf` `.glb` `.usd` `.usda` `.usdc` `.usdz` |

Geometry, PBR materials, coordinate-system conversion, unit normalization, color-space-correct texture handling, validation, and automatic repair of common issues all work end-to-end.

**Not implemented yet (honest list):** FBX (licensing decision required), skeletons/animation/morph targets (schema ready), Draco/KTX2 compression, MaterialX, USD composition arcs on import.

## Install

```bash
cd universal3d
pip install -e ".[dev]"
```

## CLI

```bash
universal3d path/to/model.obj path/to/out.usdz --format usdz
```

Add `--report report.json` for the full inspection/validation/repair report.

## Library

```python
from pathlib import Path
from universal3d.pipeline import UniversalConverter, build_default_registry
from universal3d.core.privacy import network_lockdown

registry = build_default_registry()
converter = UniversalConverter(registry)

with network_lockdown():
    result = converter.convert(
        Path("model.glb"), Path("model.usdz"), target_format="usdz", auto_repair=True,
    )

print(result.inspection)
print(result.validation_after_repair)
```

## Tests

```bash
python -m pytest tests/ -v -s
```

The smoke test proves the network lockdown actually blocks sockets, not just claims to.
