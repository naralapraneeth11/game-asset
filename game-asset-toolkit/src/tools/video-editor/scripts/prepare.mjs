// Copies installed dependencies only. Never fetches codec code from a CDN.
import { createRequire } from "node:module";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const app = resolve(directory, "../../../..");
const require = createRequire(join(app, "package.json"));
const destination = join(app, "public/tools/video-editor/vendor");
const packages = { "@ffmpeg/ffmpeg": "0.12.15", "@ffmpeg/core": "0.12.10", "@ffmpeg/core-mt": "0.12.10", mediabunny: "1.56.3" };

function packageRoot(name) {
  let current;
  try { current = dirname(require.resolve(name)); }
  catch { throw new Error(`Missing ${name}. Run npm install from game-asset-toolkit, then npm run prepare:video-editor.`); }
  while (current !== dirname(current)) {
    const metadata = join(current, "package.json");
    if (existsSync(metadata)) {
      const info = JSON.parse(readFileSync(metadata, "utf8"));
      if (info.name === name) {
        if (info.version !== packages[name]) throw new Error(`${name} must be ${packages[name]}, but ${info.version} is installed. Install the pinned package.json dependencies before preparing video assets.`);
        return current;
      }
    }
    current = dirname(current);
  }
  throw new Error(`Could not locate ${name}. Reinstall dependencies in game-asset-toolkit.`);
}

try {
  const roots = Object.fromEntries(Object.keys(packages).map((name) => [name, packageRoot(name)]));
  const copies = [];
  const wrapper = join(roots["@ffmpeg/ffmpeg"], "dist/esm");
  for (const name of readdirSync(wrapper)) if (name.endsWith(".js")) copies.push([join(wrapper, name), join(destination, "ffmpeg", name)]);
  for (const [name, folder, files] of [
    ["@ffmpeg/core", "single", ["ffmpeg-core.js", "ffmpeg-core.wasm"]],
    ["@ffmpeg/core-mt", "multi", ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"]],
  ]) for (const file of files) copies.push([join(roots[name], "dist/esm", file), join(destination, folder, file)]);
  const licenses = resolve(directory, "../licenses");
  for (const name of readdirSync(licenses)) copies.push([join(licenses, name), join(destination, "licenses", name)]);
  copies.push([join(roots.mediabunny, "LICENSE"), join(destination, "licenses/mediabunny-MPL-2.0.txt")]);
  for (const [source] of copies) if (!existsSync(source) || !statSync(source).isFile()) throw new Error(`Missing video asset ${source}. Reinstall dependencies, then run npm run prepare:video-editor.`);
  const wasm = join(app, "public/tools/video-editor/pixel-ops.wasm");
  if (!existsSync(wasm)) throw new Error("The included pixel-ops.wasm is missing. Copy public/tools/video-editor/pixel-ops.wasm from this release, or rebuild it with npm run build:video-editor-rust.");
  const header = readFileSync(wasm).subarray(0, 8);
  if (header.toString("hex") !== "0061736d01000000") throw new Error("pixel-ops.wasm is not a valid WebAssembly file. Replace it with the binary from this release.");
  for (const [source, target] of copies) {
    mkdirSync(dirname(target), { recursive: true });
    // Compare bytes so repeated dev/build hooks do not rewrite identical assets.
    if (!existsSync(target) || !readFileSync(source).equals(readFileSync(target))) copyFileSync(source, target);
  }
  writeFileSync(join(destination, "versions.json"), `${JSON.stringify(packages, null, 2)}\n`);
  console.log(`Prepared ${copies.length} self-hosted video assets. Rust compiler is not required.`);
} catch (error) {
  console.error(`[video-editor] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
