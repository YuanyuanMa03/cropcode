import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptsDir, "..");
const outputDir = path.join(root, "dist-portable");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await build({
  // Monorepo: CLI entrypoint lives in packages/cli/src/cli.tsx.
  // The bundle output is self-contained (packages: "bundle" inlines @YuanyuanMa03/cropcode-core).
  entryPoints: [path.join(root, "packages", "cli", "src", "cli.tsx")],
  outfile: path.join(outputDir, "cli.js"),
  bundle: true,
  packages: "bundle",
  platform: "node",
  format: "esm",
  target: "node22",
  jsx: "automatic",
  jsxImportSource: "react",
  alias: {
    "react-devtools-core": path.join(scriptsDir, "react-devtools-core-shim.js"),
  },
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
  },
  logOverride: { "empty-import-meta": "silent" },
});

console.log("Built self-contained application bundle in dist-portable/cli.js");
