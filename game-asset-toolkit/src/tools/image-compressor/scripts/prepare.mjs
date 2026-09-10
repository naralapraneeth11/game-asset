import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const tool = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(tool, '../../..');
const version = 'v1';
const output = path.join(root, 'public/tools/image-compressor', version);
const pins = { jpeg: '1.6.0', webp: '1.5.0', avif: '2.1.1', oxipng: '2.3.0', jxl: '1.3.0' };
await fs.mkdir(output, { recursive: true });
const assets = [];
async function write(relative, content) { const dest = path.join(output, relative); await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.writeFile(dest, content); assets.push(`/tools/image-compressor/${version}/${relative}`); }
// Single-thread policy is explicit even if the host later enables cross-origin isolation.
// SIMD is tested with the published feature detector; nested codec thread pools stay disabled.
const featureRoot = path.dirname(createRequire(require.resolve('@jsquash/webp/package.json')).resolve('wasm-feature-detect/package.json'));
await write('codecs/feature-detect-original.js', await fs.readFile(path.join(featureRoot, 'dist/esm/index.js')));
await write('codecs/feature-detect.js', "export { simd } from './feature-detect-original.js';\nexport const threads = async () => false;\n");
await write('codecs/FEATURE-DETECT-LICENSE.txt', await fs.readFile(path.join(featureRoot, 'LICENSE')));
for (const [codec, version] of Object.entries(pins)) {
  const pkg = path.dirname(require.resolve(`@jsquash/${codec}/package.json`));
  const manifest = JSON.parse(await fs.readFile(path.join(pkg, 'package.json'), 'utf8'));
  if (manifest.version !== version) throw new Error(`Expected @jsquash/${codec}@${version}; found ${manifest.version}.`);
  async function copy(dir, relative = '') {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const rel = path.posix.join(relative, entry.name), filename = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'node_modules') await copy(filename, rel); }
      else if (/\.(js|wasm)$|license|notice|copying|readme|package\.json/i.test(entry.name)) {
        let data = await fs.readFile(filename);
        if (rel.endsWith('.js')) {
          let text = data.toString();
          const replacement = path.posix.relative(path.posix.dirname(`${codec}/${rel}`), 'feature-detect.js');
          text = text.replace(/(['"])wasm-feature-detect\1/g, JSON.stringify(replacement.startsWith('.') ? replacement : `./${replacement}`));
          data = Buffer.from(text);
        }
        await write(`codecs/${codec}/${rel}`, data);
      }
    }
  }
  await copy(pkg);
}
for (const filename of ['core.ts', 'headers.ts', 'compress.worker.ts']) {
  const result = ts.transpileModule(await fs.readFile(path.join(tool, 'engine', filename), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, isolatedModules: true }, fileName: filename });
  await write(filename.replace('.ts', '.js'), result.outputText);
}
await write('codec-versions.json', JSON.stringify({ version, codecs: pins, imagePersistence: false, threading: 'single', generatedAt: new Date().toISOString() }, null, 2));
await fs.writeFile(path.join(root, 'public/tools/image-compressor/assets.json'), JSON.stringify({ version, assets }, null, 2));
await fs.copyFile(path.join(tool, 'engine/offline-sw.js'), path.join(root, 'public/image-compressor-sw.js'));
console.log(`Prepared ${assets.length} self-hosted assets for Image Compressor.`);
