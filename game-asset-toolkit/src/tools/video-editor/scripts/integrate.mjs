// Run from the app root after copying this tool's files. No network, Git, or install actions.
// Plan every edit first; unknown source shapes leave the project untouched.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const relativePaths = ["package.json", "src/lib/tools.ts", "next.config.ts"];
const prepareCommand = "node src/tools/video-editor/scripts/prepare.mjs";
function fail(message) { throw new Error(`${message} No project files were changed. See the video editor README for manual integration.`); }
function once(text, pattern, replacement, description) {
  const matches = text.match(new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`));
  if (matches?.length !== 1) fail(`Cannot identify ${description} safely.`);
  return text.replace(pattern, replacement);
}

try {
  if (resolve(process.cwd()) !== app) fail("Run this command from the game-asset-toolkit folder.");
  const originals = new Map();
  for (const path of relativePaths) {
    const absolute = join(app, path);
    if (!existsSync(absolute)) fail(`Missing ${path}.`);
    originals.set(path, readFileSync(absolute, "utf8"));
  }
  const planned = new Map(originals);
  const pkg = JSON.parse(originals.get("package.json"));
  if (!pkg.dependencies?.next || !pkg.dependencies?.react) fail("This is not the expected Next.js app package.json.");
  pkg.dependencies = {
    ...pkg.dependencies,
    "@ffmpeg/core": "0.12.10",
    "@ffmpeg/core-mt": "0.12.10",
    "@ffmpeg/ffmpeg": "0.12.15",
    mediabunny: "1.56.3",
    fflate: "0.8.2",
    comlink: "4.4.2",
  };
  pkg.scripts ??= {};
  for (const name of ["dev", "build"]) {
    if (typeof pkg.scripts[name] !== "string" || !pkg.scripts[name].trim()) fail(`package.json needs an existing ${name} script.`);
    if (!pkg.scripts[name].includes("video-editor/scripts/prepare.mjs")) pkg.scripts[name] = `${prepareCommand} && ${pkg.scripts[name]}`;
  }
  if (!pkg.scripts.postinstall) pkg.scripts.postinstall = prepareCommand;
  else if (typeof pkg.scripts.postinstall !== "string") fail("The postinstall script is not a string.");
  else if (!pkg.scripts.postinstall.includes("video-editor/scripts/prepare.mjs")) pkg.scripts.postinstall += ` && ${prepareCommand}`;
  pkg.scripts["prepare:video-editor"] = prepareCommand;
  pkg.scripts["build:video-editor-rust"] = "node src/tools/video-editor/scripts/build-rust.mjs";
  planned.set("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

  let registry = originals.get("src/lib/tools.ts");
  const iconImport = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["'];?/;
  const imported = registry.match(iconImport);
  if (!imported) fail("Cannot find the lucide-react named import in tools.ts.");
  if (!/(?:^|,)\s*Film\s*(?:,|$)/.test(imported[1])) registry = once(registry, iconImport, (_all, names) => `import {\n  Film,${names}\n} from "lucide-react";`, "the lucide-react import");
  const category = /export\s+type\s+ToolCategory\s*=\s*([^;]+);/;
  const categoryMatch = registry.match(category);
  if (!categoryMatch || !/^[\s|"'a-z0-9-]+$/i.test(categoryMatch[1])) fail("ToolCategory is not a supported string union.");
  if (!/["']video["']/.test(categoryMatch[1])) registry = once(registry, category, (_all, value) => `export type ToolCategory = ${value.trim()} | "video";`, "ToolCategory");
  if (!/id:\s*["']video-editor["']/.test(registry)) {
    registry = once(registry, /export\s+const\s+tools\s*:\s*Tool\[\]\s*=\s*\[/, `export const tools: Tool[] = [
  {
    id: "video-editor",
    name: "Video Editor & Converter",
    shortName: "Video Editor",
    description: "Trim, resize, edit, compress and convert video locally",
    href: "/tools/video-editor",
    icon: Film,
    category: "video",
    keywords: ["video", "convert", "compress", "trim", "mp4", "webm", "gif", "audio"],
    suggested: true,
  },`, "the tools array");
  }
  if (!/\{\s*id:\s*["']video["']\s*,\s*label:/.test(registry)) {
    registry = once(registry, /export\s+const\s+categories\s*:\s*\{[^}]+\}\s*\[\]\s*=\s*\[/, (opening) => `${opening}\n  { id: "video", label: "Video Tools", description: "Edit, compress, convert" },`, "the categories array");
  }
  planned.set("src/lib/tools.ts", registry);

  let config = originals.get("next.config.ts");
  if (!/export\s+default\s+withVideoEditor\(\s*nextConfig\s*\)\s*;?/.test(config)) {
    config = once(config, /export\s+default\s+nextConfig\s*;?/, "export default withVideoEditor(nextConfig);", "the nextConfig default export");
  }
  if (!/import\s*\{\s*withVideoEditor\s*\}\s*from\s*["']\.\/src\/tools\/video-editor\/config\/next["']/.test(config)) {
    if (/import[^;]+\bwithVideoEditor\b/.test(config)) fail("withVideoEditor is already imported from an unfamiliar path.");
    config = `import { withVideoEditor } from "./src/tools/video-editor/config/next";\n${config}`;
  }
  planned.set("next.config.ts", config);

  const ignorePath = ".gitignore";
  const ignore = existsSync(join(app, ignorePath)) ? readFileSync(join(app, ignorePath), "utf8") : "";
  const ignored = ["/public/tools/video-editor/vendor/", "/.video-editor-backups/", "/.toolchains/", "/src/tools/video-editor/rust/pixel-ops/target/"];
  const missing = ignored.filter((line) => !ignore.split(/\r?\n/).includes(line));
  originals.set(ignorePath, ignore);
  planned.set(ignorePath, missing.length ? `${ignore}${ignore && !ignore.endsWith("\n") ? "\n" : ""}\n# Generated video editor assets and local build files\n${missing.join("\n")}\n` : ignore);

  const changes = [...planned].filter(([path, value]) => value !== originals.get(path));
  if (!changes.length) { console.log("Video editor integration is already up to date."); process.exit(0); }
  const backupRoot = join(app, ".video-editor-backups", new Date().toISOString().replace(/[:.]/g, "-"));
  for (const [path] of changes) {
    const backup = join(backupRoot, path);
    mkdirSync(dirname(backup), { recursive: true });
    writeFileSync(backup, originals.get(path), { flag: "wx" });
  }
  const written = [];
  try {
    for (const [path, value] of changes) { writeFileSync(join(app, path), value); written.push(path); }
  } catch (error) {
    for (const path of written) writeFileSync(join(app, path), originals.get(path));
    throw error;
  }
  console.log(`Integrated video editor into ${changes.map(([path]) => path).join(", ")}.\nBackups: ${backupRoot}\nNext: npm install (updates your lockfile and prepares self-hosted assets), then npm run build.\nCommit the updated lockfile alongside these changes.`);
} catch (error) {
  console.error(`[video-editor] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
