// Tests the engine module exactly as shipped to the browser: prepare.mjs transpiles
// engine/core.ts into public/tools/image-compressor/v2/core.js.
// Run with: npm run test:image-compressor
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, PRESET_QUALITY, AVIF_PRESET_QUALITY, fit, formatOfMime, outputGeometry, resolveFormat, safePath, savings, searchQuality, validateSettings } from "../../../../public/tools/image-compressor/v2/core.js";

test("defaults keep each image's original format", () => {
  assert.equal(DEFAULTS.format, "original");
  assert.deepEqual(validateSettings(DEFAULTS), DEFAULTS);
});

test("validateSettings rejects bad input with a clear message", () => {
  assert.throws(() => validateSettings({ ...DEFAULTS, format: "gif" }), /supported output format/);
  assert.throws(() => validateSettings({ ...DEFAULTS, quality: 0 }), /Quality must be a whole number from 1 to 100/);
  assert.throws(() => validateSettings({ ...DEFAULTS, format: "png", targetKB: 50 }), /Target size applies to lossy formats/);
  assert.doesNotThrow(() => validateSettings({ ...DEFAULTS, format: "original", targetKB: 50 }));
});

test("resolveFormat turns 'original' into the source format", () => {
  const balanced = { ...DEFAULTS, quality: PRESET_QUALITY.balanced, targetKB: 120 };
  assert.equal(resolveFormat(balanced, "jpeg").format, "jpeg");
  assert.equal(resolveFormat(balanced, "webp").quality, PRESET_QUALITY.balanced);
  // PNG stays lossless, so a size target does not apply.
  assert.equal(resolveFormat(balanced, "png").targetKB, 0);
  // AVIF uses its own scale for the same preset.
  assert.equal(resolveFormat(balanced, "avif").quality, AVIF_PRESET_QUALITY.balanced);
  // A custom quality passes through unchanged.
  assert.equal(resolveFormat({ ...DEFAULTS, quality: 71 }, "avif").quality, 71);
  // Metadata can only be kept for PNG sources.
  assert.equal(resolveFormat({ ...DEFAULTS, preservePngMetadata: true }, "jpeg").preservePngMetadata, false);
  assert.equal(resolveFormat({ ...DEFAULTS, preservePngMetadata: true }, "png").preservePngMetadata, true);
});

test("an explicit format is never changed", () => {
  const settings = { ...DEFAULTS, format: "webp", quality: 55 };
  assert.deepEqual(resolveFormat(settings, "png"), settings);
});

test("formatOfMime maps encoder output back to a format", () => {
  assert.equal(formatOfMime("image/webp"), "webp");
  assert.equal(formatOfMime("image/jpeg"), "jpeg");
  assert.equal(formatOfMime("text/plain"), null);
});

test("fit keeps aspect ratio and never enlarges", () => {
  assert.deepEqual(fit(4000, 2000, 1000, 0), { width: 1000, height: 500 });
  assert.deepEqual(fit(400, 200, 1000, 1000), { width: 400, height: 200 });
});

test("outputGeometry scales very large images only when allowed", () => {
  // 18 MP scaled to the 8 MP working budget, keeping 2:1.
  assert.deepEqual(outputGeometry(6000, 3000, { ...DEFAULTS, autoResize: true }, 8_000_000), { width: 4000, height: 2000 });
  assert.throws(() => outputGeometry(6000, 3000, { ...DEFAULTS, autoResize: false }, 8_000_000), /Fit large images safely/);
});

test("safePath keeps folders, swaps the extension and avoids collisions", () => {
  const used = new Set();
  assert.equal(safePath("art/hero.png", "webp", used), "art/hero.webp");
  assert.equal(safePath("art/hero.png", "webp", used), "art/hero-2.webp");
  assert.equal(safePath("../../etc/con.png", "png", new Set()), "etc/_con.png");
});

test("savings reports percent saved", () => {
  assert.equal(savings(1000, 250), 75);
  assert.equal(savings(0, 10), 0);
});

test("searchQuality finds the best quality under a target", async () => {
  const encode = async (quality) => new ArrayBuffer(quality * 10);
  const found = await searchQuality(encode, 500, 10, () => {});
  // A bounded search (8 candidates): close to the best fit, never over the target.
  assert.equal(found.targetMet, true);
  assert.ok(found.buffer.byteLength <= 500 && found.quality >= 45, `quality ${found.quality}`);
  const missed = await searchQuality(encode, 50, 10, () => {});
  assert.equal(missed.targetMet, false);
  assert.equal(missed.quality, 10);
});
