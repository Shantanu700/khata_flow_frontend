import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated from the API schema by `bun run gen:api`.
    "lib/client/**",
    // vinext build output for Cloudflare Workers.
    ".cloudflare/**",
    ".vinext/**",
    "dist/**",
    // design-sync: staged converter scripts and generated bundle
    ".ds-sync/**",
    "ds-bundle/**",
  ]),
]);

export default eslintConfig;
