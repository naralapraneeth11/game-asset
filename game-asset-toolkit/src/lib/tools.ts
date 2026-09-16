import {
  Scaling,
  Box,
  Grid3X3,
  Package,
  FileImage,
  ImageDown,
  Braces,
  ShieldCheck,
  KeyRound,
  Binary,
  Link2,
  Fingerprint,
  Regex,
  Shuffle,
  Clock3,
  Palette,
  LockKeyhole,
  type LucideIcon,
} from "lucide-react";

export type ToolCategory = "image" | "3d" | "sprite" | "developer";
export type DeveloperGroup = "Formatters" | "Encoding" | "Security & Tokens" | "Generators" | "Utilities";
export const developerGroups: DeveloperGroup[] = ["Formatters", "Encoding", "Security & Tokens", "Generators", "Utilities"];

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
  group?: DeveloperGroup;
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
  {
    id: "json-formatter",
    name: "JSON Formatter",
    shortName: "JSON Formatter",
    description: "Beautify, minify, validate and explore JSON locally",
    href: "/tools/dev/json-formatter",
    icon: Braces,
    category: "developer",
    group: "Formatters",
    keywords: ["json", "formatter", "beautify", "minify", "pretty", "validate"],
    suggested: true,
    isNew: true,
  },
  {
    id: "json-validator",
    name: "JSON Validator",
    shortName: "JSON Validator",
    description: "Validate JSON with clear error messages and line numbers",
    href: "/tools/dev/json-validator",
    icon: ShieldCheck,
    category: "developer",
    group: "Formatters",
    keywords: ["json", "validate", "validator", "schema", "error"],
    isNew: true,
  },
  {
    id: "base64",
    name: "Base64 Encode / Decode",
    shortName: "Base64",
    description: "Text, files and images · URL-safe · Data URI",
    href: "/tools/dev/base64",
    icon: Binary,
    category: "developer",
    group: "Encoding",
    keywords: ["base64", "encode", "decode", "data uri", "binary"],
    suggested: true,
    isNew: true,
  },
  {
    id: "url-encode",
    name: "URL Encode / Decode",
    shortName: "URL Encode",
    description: "Encode and decode URL components safely",
    href: "/tools/dev/url-encode",
    icon: Link2,
    category: "developer",
    group: "Encoding",
    keywords: ["url", "encode", "decode", "percent", "uri"],
    isNew: true,
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    shortName: "JWT Decoder",
    description: "Decode, inspect and verify JSON Web Tokens locally",
    href: "/tools/dev/jwt-decoder",
    icon: KeyRound,
    category: "developer",
    group: "Security & Tokens",
    keywords: ["jwt", "token", "decode", "jwt.io", "claims"],
    suggested: true,
    isNew: true,
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    shortName: "Hash Generator",
    description: "MD5, SHA-1, SHA-256, SHA-384, SHA-512 · Files supported",
    href: "/tools/dev/hash-generator",
    icon: Fingerprint,
    category: "developer",
    group: "Security & Tokens",
    keywords: ["hash", "md5", "sha", "checksum", "digest"],
    isNew: true,
  },
  {
    id: "password-generator",
    name: "Password Generator",
    shortName: "Password",
    description: "Cryptographically secure passwords with Web Crypto",
    href: "/tools/dev/password-generator",
    icon: LockKeyhole,
    category: "developer",
    group: "Security & Tokens",
    keywords: ["password", "generator", "secure", "random"],
    isNew: true,
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    shortName: "UUID",
    description: "Generate UUID v4 values in bulk",
    href: "/tools/dev/uuid-generator",
    icon: Shuffle,
    category: "developer",
    group: "Generators",
    keywords: ["uuid", "guid", "v4", "generate", "random"],
    isNew: true,
  },
  {
    id: "timestamp",
    name: "Timestamp Converter",
    shortName: "Timestamp",
    description: "Unix timestamp ↔ human-readable date",
    href: "/tools/dev/timestamp",
    icon: Clock3,
    category: "developer",
    group: "Generators",
    keywords: ["timestamp", "unix", "epoch", "date", "time"],
    isNew: true,
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    shortName: "Regex Tester",
    description: "Live matching, groups, replace and highlighting",
    href: "/tools/dev/regex-tester",
    icon: Regex,
    category: "developer",
    group: "Utilities",
    keywords: ["regex", "regexp", "test", "match", "replace"],
    isNew: true,
  },
  {
    id: "color-converter",
    name: "Color Converter",
    shortName: "Color",
    description: "HEX ↔ RGB ↔ HSL ↔ OKLCH with live preview",
    href: "/tools/dev/color-converter",
    icon: Palette,
    category: "developer",
    group: "Utilities",
    keywords: ["color", "hex", "rgb", "hsl", "oklch", "convert"],
    isNew: true,
  },
];

/** Developer tools only — used by route metadata and the /tools/dev hub. */
export const developerTools: Tool[] = tools.filter((t) => t.category === "developer");

export const categories: {
  id: ToolCategory;
  label: string;
  description: string;
}[] = [
  { id: "image", label: "Image Tools", description: "Scale, compress, convert" },
  { id: "sprite", label: "Sprite Tools", description: "Pack, export, atlas" },
  { id: "3d", label: "3D Tools", description: "Convert models" },
  { id: "developer", label: "Developer Tools", description: "JSON, JWT, Base64, Hash..." },
];

export function getSuggestedTools() {
  return tools.filter((t) => t.suggested);
}

export function getToolsByCategory(category: ToolCategory) {
  return tools.filter((t) => t.category === category);
}

export function getDeveloperToolsByGroup(group: DeveloperGroup) {
  return tools.filter((t) => t.category === "developer" && t.group === group);
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

export function getDeveloperTools() {
  return tools.filter((t) => t.category === "developer");
}
