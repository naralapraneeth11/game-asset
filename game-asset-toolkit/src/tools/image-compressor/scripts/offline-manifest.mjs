import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const folder = path.join(root, 'public/tools/image-compressor');
const manifest = JSON.parse(await fs.readFile(path.join(folder, 'assets.json'), 'utf8'));
const build = (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim();
const assets = [...manifest.assets];
async function scan(dir, relative = '') {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const rel = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) await scan(path.join(dir, entry.name), rel);
    else if (/\.(js|css|woff2?|ttf|otf|wasm)$/.test(entry.name)) assets.push('/_next/static/' + rel);
  }
}
await scan(path.join(root, '.next/static'));
await fs.writeFile(path.join(folder, 'offline-assets.json'), JSON.stringify({ build, assets }, null, 2));
console.log(`Prepared offline manifest for ${assets.length} assets.`);
