import {
  AppWindow,
  Binary,
  Box,
  Braces,
  Clapperboard,
  Clock3,
  Code2,
  Fingerprint,
  Film,
  Gamepad2,
  Globe,
  Grid3X3,
  ImageDown,
  ImageIcon,
  ImagePlay,
  KeyRound,
  Link2,
  LockKeyhole,
  Minimize2,
  Palette,
  Regex,
  Repeat,
  Scaling,
  ShieldCheck,
  Shuffle,
  FileImage,
  type LucideIcon,
} from "lucide-react";

/**
 * The tool registry. Navigation, search, the home page, hub pages, related
 * tools, metadata, structured data and the sitemap are all generated from it.
 *
 * Adding a tool: add an entry here, add its copy to `src/lib/seo-copy.ts`
 * (TypeScript refuses to build until you do), then create
 * `src/app/<id>/page.tsx`. The id is the URL slug, so use the phrase people
 * search for. Renaming a live id needs a 301 in `src/lib/redirects.ts`.
 *
 * This file is imported by client components, so keep long copy out of it.
 */

export type ToolCategory = "image" | "video" | "game-dev" | "developer";
export type ToolStatus = "live" | "hidden";
export type DeveloperGroup = "Formatters" | "Encoding" | "Security & Tokens" | "Generators" | "Utilities";
export const developerGroups: readonly DeveloperGroup[] = ["Formatters", "Encoding", "Security & Tokens", "Generators", "Utilities"];

export interface Category {
  id: ToolCategory;
  /** Short label for breadcrumbs, menus and section headings. */
  label: string;
  /** Hub page path. The slug is the search phrase ("video tools online"). */
  href: string;
  /** One line under the section heading. */
  description: string;
  icon: LucideIcon;
}

export const categories: readonly Category[] = [
  { id: "image", label: "Image & Icons", href: "/image-tools", description: "Compress images, render SVG, make favicons and app icons", icon: ImageIcon },
  { id: "video", label: "Video", href: "/video-tools", description: "Compress, convert, trim and turn clips into GIFs", icon: Film },
  { id: "game-dev", label: "Game Dev", href: "/game-dev-tools", description: "Sprite sheets and asset pipelines", icon: Gamepad2 },
  { id: "developer", label: "Developer", href: "/developer-tools", description: "JSON, JWT, Base64, hashes, regex and more", icon: Code2 },
];

interface ToolDefinition {
  /** URL slug and stable identifier. */
  id: string;
  name: string;
  /** Compact name for menus and chips. */
  shortName: string;
  /** One line naming the job, shown on cards ("Shrink MP4, MOV and WebM without uploading"). */
  tagline: string;
  icon: LucideIcon;
  category: ToolCategory;
  group?: DeveloperGroup;
  /** Extra words for on-site search only. Search engines ignore meta keywords. */
  keywords: readonly string[];
  /** `hidden` tools are off navigation, search and the sitemap, and 404 in production. */
  status: ToolStatus;
  /** Works after the first visit with no connection. Only claim what the tool really supports. */
  offline?: boolean;
  /**
   * Needs cross-origin isolation (COOP/COEP) for multi-threaded FFmpeg. Links
   * to these pages use a full page load so the server can send the headers;
   * see `VIDEO_ROUTES` in src/lib/routes.ts.
   */
  isolated?: boolean;
}

const definitions = [
  // Image & Icons
  {
    id: "image-compressor",
    name: "Image Compressor",
    shortName: "Image Compressor",
    tagline: "Shrink JPEG, PNG, WebP and AVIF images in batches",
    icon: ImageDown,
    category: "image",
    keywords: ["compress", "optimize", "reduce", "jpeg", "jpg", "png", "webp", "avif", "size", "tinypng"],
    status: "live",
    offline: true,
  },
  {
    id: "svg-to-png",
    name: "SVG to PNG Converter",
    shortName: "SVG to PNG",
    tagline: "Render SVG to crisp PNGs at any size",
    icon: FileImage,
    category: "image",
    keywords: ["svg", "png", "convert", "rasterize", "vector", "export"],
    status: "live",
  },
  {
    id: "favicon-generator",
    name: "Favicon Generator",
    shortName: "Favicon Generator",
    tagline: "favicon.ico, touch icons and a web manifest from one SVG",
    icon: Globe,
    category: "image",
    keywords: ["favicon", "ico", "pwa", "manifest", "apple touch icon", "web icon"],
    status: "live",
  },
  {
    id: "app-icon-generator",
    name: "App Icon Generator",
    shortName: "App Icon Generator",
    tagline: "iOS, macOS and Android icon sets from one SVG",
    icon: AppWindow,
    category: "image",
    keywords: ["app icon", "ios", "android", "appiconset", "mipmap", "adaptive icon", "xcode"],
    status: "live",
  },

  // Video
  {
    id: "video-compressor",
    name: "Video Compressor",
    shortName: "Video Compressor",
    tagline: "Shrink MP4, MOV and WebM without uploading",
    icon: Minimize2,
    category: "video",
    keywords: ["compress", "reduce", "shrink", "smaller", "mp4", "mov", "webm", "size", "discord", "email"],
    status: "live",
    isolated: true,
  },
  {
    id: "video-converter",
    name: "Video Converter",
    shortName: "Video Converter",
    tagline: "Convert between MP4, WebM, MOV, GIF and MP3",
    icon: Repeat,
    category: "video",
    keywords: ["convert", "mp4", "webm", "mov", "gif", "mp3", "format", "mkv"],
    status: "live",
    isolated: true,
  },
  {
    id: "video-to-gif",
    name: "Video to GIF",
    shortName: "Video to GIF",
    tagline: "Turn a short clip into a looping GIF",
    icon: ImagePlay,
    category: "video",
    keywords: ["gif", "animated", "mp4 to gif", "loop", "clip"],
    status: "live",
    isolated: true,
  },
  {
    id: "video-editor",
    name: "Video Editor",
    shortName: "Video Editor",
    tagline: "Trim, crop, rotate, color and caption video",
    icon: Clapperboard,
    category: "video",
    keywords: ["edit", "trim", "cut", "crop", "rotate", "watermark", "text", "audio", "speed"],
    status: "live",
    isolated: true,
  },

  // Game Dev
  {
    id: "sprite-sheet-packer",
    name: "Sprite Sheet Packer",
    shortName: "Sprite Packer",
    tagline: "Pack sprites into an atlas with Phaser and PixiJS JSON",
    icon: Grid3X3,
    category: "game-dev",
    keywords: ["sprite", "atlas", "texture", "pack", "sheet", "texturepacker", "phaser", "pixi", "json"],
    status: "live",
  },
  {
    id: "1x-2x-3x-image-generator",
    name: "1x 2x 3x Image Generator",
    shortName: "1x 2x 3x Generator",
    tagline: "Export @1x, @2x and @3x assets from your largest image",
    icon: Scaling,
    category: "game-dev",
    keywords: ["1x", "2x", "3x", "retina", "@2x", "@3x", "mdpi", "xxhdpi", "pixel art", "resize"],
    status: "live",
  },
  {
    // Hidden: UI mockup with hard-coded stats. Needs three.js loaders/exporters before launch.
    id: "3d-model-converter",
    name: "3D Model Converter",
    shortName: "3D Converter",
    tagline: "Convert OBJ, STL, PLY and glTF models",
    icon: Box,
    category: "game-dev",
    keywords: ["3d", "obj", "stl", "ply", "gltf", "glb", "usdz", "model", "convert"],
    status: "hidden",
  },

  // Developer
  {
    id: "json-formatter",
    name: "JSON Formatter",
    shortName: "JSON Formatter",
    tagline: "Beautify, minify and explore JSON",
    icon: Braces,
    category: "developer",
    group: "Formatters",
    keywords: ["json", "format", "beautify", "pretty print", "minify", "yaml", "csv", "xml"],
    status: "live",
  },
  {
    id: "json-validator",
    name: "JSON Validator",
    shortName: "JSON Validator",
    tagline: "Check JSON and find the exact line of an error",
    icon: ShieldCheck,
    category: "developer",
    group: "Formatters",
    keywords: ["json", "validate", "lint", "check", "error", "syntax"],
    status: "live",
  },
  {
    id: "base64-encode-decode",
    name: "Base64 Encoder / Decoder",
    shortName: "Base64",
    tagline: "Encode and decode text, files and data URIs",
    icon: Binary,
    category: "developer",
    group: "Encoding",
    keywords: ["base64", "encode", "decode", "data uri", "image to base64", "binary"],
    status: "live",
  },
  {
    id: "url-encode-decode",
    name: "URL Encoder / Decoder",
    shortName: "URL Encode",
    tagline: "Percent-encode and decode URLs and query strings",
    icon: Link2,
    category: "developer",
    group: "Encoding",
    keywords: ["url", "encode", "decode", "percent", "uri", "query string", "escape"],
    status: "live",
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    shortName: "JWT Decoder",
    tagline: "Read JWT claims and verify signatures",
    icon: KeyRound,
    category: "developer",
    group: "Security & Tokens",
    keywords: ["jwt", "token", "decode", "claims", "verify", "jwt.io", "bearer"],
    status: "live",
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    shortName: "Hash Generator",
    tagline: "MD5, SHA-1 and SHA-256 hashes for text and files",
    icon: Fingerprint,
    category: "developer",
    group: "Security & Tokens",
    keywords: ["hash", "md5", "sha1", "sha256", "sha512", "checksum", "digest"],
    status: "live",
  },
  {
    id: "password-generator",
    name: "Password Generator",
    shortName: "Password",
    tagline: "Strong random passwords from your browser's crypto",
    icon: LockKeyhole,
    category: "developer",
    group: "Security & Tokens",
    keywords: ["password", "generate", "random", "secure", "strong", "passphrase"],
    status: "live",
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    shortName: "UUID",
    tagline: "Generate UUID v4 values in bulk",
    icon: Shuffle,
    category: "developer",
    group: "Generators",
    keywords: ["uuid", "guid", "v4", "random", "id", "generate"],
    status: "live",
  },
  {
    id: "unix-timestamp-converter",
    name: "Unix Timestamp Converter",
    shortName: "Timestamp",
    tagline: "Convert epoch time to a date and back",
    icon: Clock3,
    category: "developer",
    group: "Generators",
    keywords: ["timestamp", "unix", "epoch", "date", "time", "milliseconds", "utc"],
    status: "live",
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    shortName: "Regex Tester",
    tagline: "Test JavaScript regex with live matches and groups",
    icon: Regex,
    category: "developer",
    group: "Utilities",
    keywords: ["regex", "regexp", "regular expression", "test", "match", "replace"],
    status: "live",
  },
  {
    id: "color-converter",
    name: "Color Converter",
    shortName: "Color",
    tagline: "Convert HEX, RGB, HSL and OKLCH colors",
    icon: Palette,
    category: "developer",
    group: "Utilities",
    keywords: ["color", "colour", "hex", "rgb", "hsl", "oklch", "convert", "picker"],
    status: "live",
  },
  {
    "id": "mp4-to-mp3",
    "name": "MP4 to MP3 Converter",
    "shortName": "MP4 to MP3",
    "tagline": "Extract a video's soundtrack without uploading it",
    "icon": Film,
    "category": "video",
    "keywords": [
      "mp4",
      "mp3",
      "extract audio",
      "soundtrack",
      "video to audio",
      "wav",
      "aac"
    ],
    "isolated": true,
    "status": "live"
  },
  {
    "id": "mov-to-mp4",
    "name": "MOV to MP4 Converter",
    "shortName": "MOV to MP4",
    "tagline": "Convert MOV footage to a shareable H.264 MP4",
    "icon": Repeat,
    "category": "video",
    "keywords": [
      "mov",
      "mp4",
      "quicktime",
      "iphone video",
      "h264",
      "convert"
    ],
    "isolated": true,
    "status": "live"
  },
  {
    "id": "mp4-to-gif",
    "name": "MP4 to GIF Converter",
    "shortName": "MP4 to GIF",
    "tagline": "Turn a short MP4 clip into a silent looping GIF",
    "icon": ImagePlay,
    "category": "video",
    "keywords": [
      "mp4",
      "gif",
      "animation",
      "loop",
      "clip",
      "video to gif"
    ],
    "isolated": true,
    "status": "live"
  },
  {
    "id": "webm-to-mp4",
    "name": "WebM to MP4 Converter",
    "shortName": "WebM to MP4",
    "tagline": "Make WebM recordings easier to share as MP4",
    "icon": Repeat,
    "category": "video",
    "keywords": [
      "webm",
      "mp4",
      "vp9",
      "screen recording",
      "h264",
      "convert"
    ],
    "isolated": true,
    "status": "live"
  },
  {
    "id": "png-to-webp",
    "name": "PNG to WebP Converter",
    "shortName": "PNG to WebP",
    "tagline": "Convert PNG images to WebP with transparency",
    "icon": ImageDown,
    "category": "image",
    "keywords": [
      "png",
      "webp",
      "convert",
      "transparent",
      "smaller images"
    ],
    "status": "live"
  },
  {
    "id": "jpg-to-png",
    "name": "JPG to PNG Converter",
    "shortName": "JPG to PNG",
    "tagline": "Make PNG copies of JPG images on your device",
    "icon": ImageDown,
    "category": "image",
    "keywords": [
      "jpg",
      "jpeg",
      "png",
      "convert",
      "image format"
    ],
    "status": "live"
  },
  {
    "id": "webp-to-png",
    "name": "WebP to PNG Converter",
    "shortName": "WebP to PNG",
    "tagline": "Turn still WebP images into transparent PNGs",
    "icon": ImageDown,
    "category": "image",
    "keywords": [
      "webp",
      "png",
      "convert",
      "transparent",
      "image compatibility"
    ],
    "status": "live"
  },
  {
    "id": "compress-png",
    "name": "PNG Compressor",
    "shortName": "Compress PNG",
    "tagline": "Optimize PNG files while keeping their pixels",
    "icon": ImageDown,
    "category": "image",
    "keywords": [
      "png",
      "compress",
      "lossless",
      "optimize",
      "transparency",
      "reduce size"
    ],
    "status": "live"
  },
  {
    "id": "gif-to-sprite-sheet",
    "name": "GIF to Sprite Sheet",
    "shortName": "GIF to Sprites",
    "tagline": "Export composed GIF frames as a PNG atlas and JSON",
    "icon": ImagePlay,
    "category": "game-dev",
    "keywords": [
      "gif",
      "sprite sheet",
      "frames",
      "animation",
      "texture atlas",
      "duration"
    ],
    "status": "live"
  },
  {
    "id": "sprite-sheet-splitter",
    "name": "Sprite Sheet Splitter",
    "shortName": "Split Sprite Sheet",
    "tagline": "Slice a regular sprite grid into individual PNGs",
    "icon": Grid3X3,
    "category": "game-dev",
    "keywords": [
      "sprite sheet",
      "split",
      "slice",
      "grid",
      "sprites",
      "tileset",
      "png frames"
    ],
    "status": "live"
  },
  {
    "id": "pixel-art-scaler",
    "name": "Pixel Art Scaler",
    "shortName": "Pixel Art Scaler",
    "tagline": "Enlarge pixel art with crisp nearest-neighbor edges",
    "icon": Scaling,
    "category": "game-dev",
    "keywords": [
      "pixel art",
      "scale",
      "upscale",
      "nearest neighbor",
      "no blur",
      "resize sprites"
    ],
    "status": "live"
  },
  {
    "id": "wav-to-ogg",
    "name": "WAV to OGG Converter",
    "shortName": "WAV to OGG",
    "tagline": "Convert WAV masters into adjustable OGG game audio",
    "icon": Repeat,
    "category": "game-dev",
    "keywords": [
      "wav",
      "ogg",
      "vorbis",
      "game audio",
      "sound effects",
      "audio converter"
    ],
    "isolated": true,
    "status": "live"
  },
  {
    "id": "mp3-to-ogg",
    "name": "MP3 to OGG Converter",
    "shortName": "MP3 to OGG",
    "tagline": "Convert MP3 audio to OGG Vorbis on your device",
    "icon": Repeat,
    "category": "game-dev",
    "keywords": [
      "mp3",
      "ogg",
      "vorbis",
      "game music",
      "audio converter",
      "soundtrack"
    ],
    "isolated": true,
    "status": "live"
  },
] as const satisfies readonly ToolDefinition[];

export type ToolId = (typeof definitions)[number]["id"];
export interface Tool extends ToolDefinition {
  id: ToolId;
  /** Flat URL at the root: `/<id>`. */
  href: string;
}

/** Every registered tool, including hidden ones. Only use for routing and dev builds. */
export const allTools: readonly Tool[] = definitions.map((definition) => ({ ...definition, href: `/${definition.id}` }));

/** Tools visitors can see. Navigation, search, hubs and the sitemap use this list. */
export const tools: readonly Tool[] = allTools.filter((tool) => tool.status === "live");

export function getTool(id: ToolId): Tool {
  const tool = allTools.find((entry) => entry.id === id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}

/** Home page "Popular" row, in display order. Working tools only. */
const popularIds: readonly ToolId[] = ["video-compressor", "image-compressor", "svg-to-png", "sprite-sheet-packer", "json-formatter", "jwt-decoder"];
export const popularTools: readonly Tool[] = popularIds.map(getTool).filter((tool) => tool.status === "live");

export function getCategory(id: ToolCategory): Category {
  return categories.find((category) => category.id === id)!;
}

export function getToolsByCategory(category: ToolCategory): readonly Tool[] {
  return tools.filter((tool) => tool.category === category);
}

export function getDeveloperToolsByGroup(group: DeveloperGroup): readonly Tool[] {
  return tools.filter((tool) => tool.category === "developer" && tool.group === group);
}

/** Up to `limit` live tools, same category (then developer group) first. */
export function getRelatedTools(id: ToolId, limit = 4): readonly Tool[] {
  const tool = getTool(id);
  const score = (other: Tool) => (other.category === tool.category ? 2 : 0) + (tool.group && other.group === tool.group ? 1 : 0);
  return tools
    .filter((other) => other.id !== id)
    .map((other, index) => ({ other, index, score: score(other) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ other }) => other);
}

/**
 * Ranked search over live tools. Every word must match somewhere; names and
 * name prefixes rank above keyword and tagline matches.
 */
export function searchTools(query: string): readonly Tool[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return tools;
  const scored: { tool: Tool; score: number; index: number }[] = [];
  tools.forEach((tool, index) => {
    const name = `${tool.name} ${tool.shortName}`.toLowerCase();
    const extra = [tool.tagline, getCategory(tool.category).label, ...tool.keywords].join(" ").toLowerCase();
    let score = 0;
    for (const word of words) {
      if (name.split(/[\s/()]+/).some((part) => part.startsWith(word))) score += 4;
      else if (name.includes(word)) score += 3;
      else if (tool.keywords.some((keyword) => keyword.startsWith(word))) score += 2;
      else if (extra.includes(word)) score += 1;
      else return;
    }
    scored.push({ tool, score, index });
  });
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).map(({ tool }) => tool);
}

