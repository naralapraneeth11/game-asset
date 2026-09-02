# Architecture

## Pipeline

```
Source file (local disk)
        │
        ▼
  Importer (per-format)  ──►  coordinate.py + units.py + colorspace.py
        │                     applied on the way IN, once, in one place
        ▼
  InternalScene (versioned, Y-up / right-handed / meters, in memory only)
        │
        ▼
  AssetValidator  ──►  ValidationReport (errors / warnings, JSON-serializable)
        │
        ▼
  AssetRepairEngine  ──►  RepairLog (every fix actually applied, logged)
        │
        ▼
  AssetValidator again  ──►  confirms repair worked
        │
        ▼
  Exporter (per-format)  ──►  same coordinate.py + units.py, run backwards
        │
        ▼
Output file (local disk)
```

Every stage is a plain Python object with real, inspectable state. `ConversionResult` carries the inspection, both validation reports, and the repair log back to the caller. Nothing is hidden inside a black-box "convert()" call.

## Why everything stays local

This is a design decision enforced in code, not just a policy:

1. **No network-capable dependencies in the conversion path.** `trimesh`, `numpy`, `pillow`, and `usd-core` are all local, offline-capable libraries.
2. **`core/privacy.py`'s `network_lockdown()`** wraps every conversion. It monkey-patches `socket.socket.connect`/`connect_ex` to raise `NetworkAccessBlocked` for the duration of the call — including loopback.
3. **Temp files stay in the OS temp directory** and are cleaned up in the same function that created them.
4. **No telemetry, no analytics, no update-checker.**

## Extending it

Add a new format by writing one `Importer`/`Exporter` pair (see `core/interfaces.py`) and registering it in `pipeline.build_default_registry()`. Nothing else needs to change.

`importers/fbx_importer.py` is a deliberate stub because FBX support is gated on a real licensing decision (Autodesk FBX SDK vs Assimp vs Blender `bpy`).

## What this does NOT implement yet

- FBX import/export (licensing decision required first)
- Skeletons / skinning import (schema supports it)
- Animation import/export (schema supports it)
- Morph targets (schema field exists, unused)
- Draco / meshoptimizer / KTX2 compression
- MaterialX
- Tangent generation (MikkTSpace)
- USD composition arcs on **import**
- Texture atlas / UDIM handling
