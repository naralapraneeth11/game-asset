"""
core/interfaces.py

Plugin contracts. A new format is added by writing one Importer and/or
Exporter class and registering it -- nothing else in the codebase needs
to change.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from pathlib import Path

from .schema import InternalScene


class Importer(ABC):
    format_id: str = "unknown"
    extensions: tuple = ()

    @abstractmethod
    def can_import(self, path: Path) -> bool:
        ...

    @abstractmethod
    def import_scene(self, path: Path) -> InternalScene:
        ...


class Exporter(ABC):
    format_id: str = "unknown"
    extensions: tuple = ()

    @abstractmethod
    def export_scene(self, scene: InternalScene, path: Path) -> None:
        ...


class FormatRegistry:
    """Single place new formats get wired in. pipeline.py never hardcodes
    a format name -- it only ever asks this registry."""

    def __init__(self):
        self._importers: dict[str, Importer] = {}
        self._exporters: dict[str, Exporter] = {}

    def register_importer(self, importer: Importer) -> None:
        self._importers[importer.format_id] = importer

    def register_exporter(self, exporter) -> None:
        self._exporters[exporter.format_id] = exporter

    def importer_for(self, path: Path) -> Importer:
        ext = path.suffix.lower().lstrip(".")
        for imp in self._importers.values():
            if ext in imp.extensions:
                return imp
        raise ValueError(
            f"No importer registered for extension '.{ext}'. "
            f"Supported: {self.supported_import_extensions()}"
        )

    def exporter_for(self, format_id: str):
        if format_id not in self._exporters:
            raise ValueError(
                f"No exporter registered for format '{format_id}'. "
                f"Supported: {self.supported_export_formats()}"
            )
        return self._exporters[format_id]

    def supported_import_extensions(self) -> list:
        exts = set()
        for imp in self._importers.values():
            exts.update(imp.extensions)
        return sorted(exts)

    def supported_export_formats(self) -> list:
        return sorted(self._exporters.keys())
