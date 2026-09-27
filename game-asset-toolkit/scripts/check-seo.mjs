// Checks src/lib/seo-copy.ts against the SEO rules: title ≤ 45 characters
// (the layout adds " | Brand"), description 140–160 characters, 3–4 steps,
// 4–6 FAQ entries, and no paragraph repeated across pages.
// Usage: npm run check:seo
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await fs.readFile(path.join(root, "src/lib/seo-copy.ts"), "utf8");
const { outputText } = ts.transpileModule(source.replace(/^import "server-only";$/m, ""), {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
});
const { toolSeo, hubSeo, homeSeo, privacyNote } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const problems = [];
const seen = new Map();
const words = (text) => text.split(/\s+/).filter(Boolean).length;
const unique = (page, text) => {
  const owner = seen.get(text);
  if (owner && owner !== page) problems.push(`${page}: paragraph repeats ${owner}: "${text.slice(0, 60)}…"`);
  seen.set(text, page);
};
const checkMeta = (page, { title, description }, maxTitle = 45) => {
  if (title.length > maxTitle) problems.push(`${page}: title is ${title.length} chars (max ${maxTitle}): ${title}`);
  if (description.length < 140 || description.length > 160) problems.push(`${page}: description is ${description.length} chars (140–160)`);
};

checkMeta("home", homeSeo, 60);
const rows = [];
for (const [id, seo] of Object.entries(toolSeo)) {
  checkMeta(id, seo);
  if (seo.steps.length < 3 || seo.steps.length > 4) problems.push(`${id}: ${seo.steps.length} steps (3–4)`);
  if (seo.faq.length < 4 || seo.faq.length > 6) problems.push(`${id}: ${seo.faq.length} FAQ entries (4–6)`);
  [seo.intro, ...seo.steps, ...seo.faq.flatMap((item) => [item.q, item.a])].forEach((text) => unique(id, text));
  const count = words([seo.h1, seo.intro, ...seo.steps, ...seo.faq.flatMap((item) => [item.q, item.a]), privacyNote].join(" "));
  rows.push({ page: id, title: seo.title.length, description: seo.description.length, words: count });
}
for (const [id, seo] of Object.entries(hubSeo)) {
  checkMeta(`hub:${id}`, seo);
  [seo.intro, ...seo.body, ...seo.faq.flatMap((item) => [item.q, item.a])].forEach((text) => unique(`hub:${id}`, text));
}

console.table(rows);
if (problems.length) {
  console.error(`\n${problems.length} SEO copy problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`SEO copy OK: ${rows.length} tools, ${Object.keys(hubSeo).length} hubs, home.`);
