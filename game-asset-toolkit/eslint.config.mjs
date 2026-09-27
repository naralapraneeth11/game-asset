import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts", "src/tools/video-editor/rust/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // CommonJS test harnesses (e.g. the SVG engine acceptance suite) use require().
  { files: ["**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];

export default config;
