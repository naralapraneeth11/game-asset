import {
  Scaling,
  Box,
  Grid3X3,
  Package,
  FileImage,
  ImageDown,
  type LucideIcon,
} from "lucide-react";

export type ToolCategory = "image" | "3d" | "sprite" | "developer";

export interface Tool {
  id: string;
  name: string;
  shortName: string;
  description: string;
  href: string;
  icon: LucideIcon;
  category: ToolCategory;
  keywords: string[];
  suggested?: boolean;
  isNew?: boolean;
}

export const tools: Tool[] = [
  {
    id: "image-scaler",
    name: "1x / 2x / 3x Image Scaler",
    shortName: "Image Scaler",
    description: "High-quality and pixel-art modes · Correct naming · ZIP export",
    href: "/tools/1x-2x-3x-converter",
    icon: Scaling,
    category: "image",
    keywords: ["scale", "1x", "2x", "3x", "retina", "pixel art", "upscale", "resize"],
    suggested: true,
  },
  {
    id: "image-compressor",
    name: "Image Compressor",
    shortName: "Compressor",
    description: "JPEG · PNG · WebP · AVIF · Local batch compress",
    href: "/tools/image-compressor",
    icon: ImageDown,
    category: "image",
    keywords: ["compress", "optimize", "webp", "avif", "jpeg", "png", "size"],
    suggested: true,
  },
  {
    id: "svg-png-set",
    name: "SVG to PNG Set",
    shortName: "SVG to PNG",
    description: "Web · Apple · Android · Favicons · App icons · Local",
    href: "/tools/svg-png-set",
    icon: FileImage,
    category: "image",
    keywords: ["svg", "png", "icon", "favicon", "apple", "android", "export"],
  },
  {
    id: "sprite-packer",
    name: "Sprite Packer",
    shortName: "Sprite Packer",
    description: "MaxRects BSSF · Alpha trim · Padding · TexturePacker JSON",
    href: "/tools/sprite-packer",
    icon: Grid3X3,
    category: "sprite",
    keywords: ["sprite", "atlas", "pack", "sheet", "texturepacker", "json"],
    suggested: true,
  },
  {
    id: "batch-export",
    name: "Batch Export",
    shortName: "Batch Export",
    description: "Multi-folder · Presets · Multi-scale · CI-ready",
    href: "/tools/batch-export",
    icon: Package,
    category: "sprite",
    keywords: ["batch", "export", "folder", "preset", "ci", "automation"],
  },
  {
    id: "3d-converter",
    name: "3D Converter",
    shortName: "3D Converter",
    description: "OBJ · STL · PLY · glTF · GLB · USD · USDZ · Local only",
    href: "/tools/3d-converter",
    icon: Box,
    category: "3d",
    keywords: ["3d", "obj", "stl", "gltf", "glb", "usd", "usdz", "convert", "model"],
    suggested: true,
  },
];

export const categories: {
  id: ToolCategory;
  label: string;
  description: string;
}[] = [
  { id: "image", label: "Image Tools", description: "Scale, compress, convert" },
  { id: "sprite", label: "Sprite Tools", description: "Pack, export, atlas" },
  { id: "3d", label: "3D Tools", description: "Convert models" },
  { id: "developer", label: "Developer Tools", description: "JSON, Base64, JWT..." },
];

export function getSuggestedTools() {
  return tools.filter((t) => t.suggested);
}

export function getToolsByCategory(category: ToolCategory) {
  return tools.filter((t) => t.category === category);
}

export function searchTools(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return tools;
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.shortName.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.includes(q))
  );
}

export function getToolByHref(href: string) {
  return tools.find((t) => t.href === href);
}
