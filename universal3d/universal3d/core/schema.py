"""
core/schema.py

The internal scene representation every importer converts INTO and every
exporter converts OUT OF. Fixed internal convention: Y-up, right-handed, meters.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import numpy as np

SCHEMA_VERSION = "1.0.0"


@dataclass
class Texture:
    id: str
    embedded_data: Optional[bytes] = None
    source_path: Optional[str] = None
    color_space: str = "linear"
    channel: str = "unknown"


@dataclass
class PBRMaterial:
    id: str
    name: str = "Material"
    base_color_factor: tuple = (1.0, 1.0, 1.0, 1.0)
    metallic_factor: float = 1.0
    roughness_factor: float = 1.0
    emissive_factor: tuple = (0.0, 0.0, 0.0)
    base_color_texture: Optional[str] = None
    metallic_roughness_texture: Optional[str] = None
    normal_texture: Optional[str] = None
    normal_texture_convention: str = "opengl"
    occlusion_texture: Optional[str] = None
    emissive_texture: Optional[str] = None
    double_sided: bool = False
    alpha_mode: str = "OPAQUE"


@dataclass
class MorphTarget:
    name: str
    position_deltas: np.ndarray
    normal_deltas: Optional[np.ndarray] = None


@dataclass
class Mesh:
    id: str
    name: str = "Mesh"
    positions: np.ndarray = None
    normals: Optional[np.ndarray] = None
    tangents: Optional[np.ndarray] = None
    uvs: Optional[np.ndarray] = None
    vertex_colors: Optional[np.ndarray] = None
    indices: np.ndarray = None
    material_id: Optional[str] = None
    joint_indices: Optional[np.ndarray] = None
    joint_weights: Optional[np.ndarray] = None
    morph_targets: list = field(default_factory=list)


@dataclass
class Node:
    id: str
    name: str = "Node"
    translation: tuple = (0.0, 0.0, 0.0)
    rotation: tuple = (0.0, 0.0, 0.0, 1.0)
    scale: tuple = (1.0, 1.0, 1.0)
    mesh_id: Optional[str] = None
    children: list = field(default_factory=list)
    camera_id: Optional[str] = None
    light_id: Optional[str] = None
    skin_id: Optional[str] = None


@dataclass
class Skin:
    id: str
    joint_node_ids: list = field(default_factory=list)
    inverse_bind_matrices: Optional[np.ndarray] = None
    skeleton_root_id: Optional[str] = None


@dataclass
class AnimationChannel:
    target_node_id: str
    target_path: str
    times: np.ndarray
    values: np.ndarray


@dataclass
class Animation:
    id: str
    name: str = "Animation"
    channels: list = field(default_factory=list)


@dataclass
class Camera:
    id: str
    name: str = "Camera"
    yfov_radians: float = 0.6
    znear: float = 0.1
    zfar: float = 1000.0
    orthographic: bool = False


@dataclass
class Light:
    id: str
    name: str = "Light"
    type: str = "point"
    color: tuple = (1.0, 1.0, 1.0)
    intensity: float = 1.0


@dataclass
class SceneMetadata:
    source_format: Optional[str] = None
    source_file_name: Optional[str] = None
    up_axis: str = "y"
    handedness: str = "right"
    unit_scale_applied: float = 1.0


@dataclass
class InternalScene:
    schema_version: str = SCHEMA_VERSION
    nodes: dict = field(default_factory=dict)
    meshes: dict = field(default_factory=dict)
    materials: dict = field(default_factory=dict)
    textures: dict = field(default_factory=dict)
    animations: dict = field(default_factory=dict)
    skins: dict = field(default_factory=dict)
    cameras: dict = field(default_factory=dict)
    lights: dict = field(default_factory=dict)
    root_node_ids: list = field(default_factory=list)
    metadata: SceneMetadata = field(default_factory=SceneMetadata)

    def validate_schema_version(self) -> None:
        current_major = SCHEMA_VERSION.split(".")[0]
        this_major = self.schema_version.split(".")[0]
        if this_major != current_major:
            raise ValueError(
                f"InternalScene schema major version {self.schema_version} is incompatible "
                f"with this codebase's version {SCHEMA_VERSION}."
            )
