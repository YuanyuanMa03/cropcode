import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function run(command, args, label) {
  process.stdout.write(`\n[${label}] ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, { stdio: "inherit", cwd: root, shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("=========================================");
console.log("  CropCode CLI — Build");
console.log("=========================================");

// 1. Build the core library (tsc emits dist/ with declarations).
run("npm", ["run", "build", "--workspace=@YuanyuanMa03/cropcode-core"], "1/3");
// 2. Rewrite extensionless relative imports in core/dist to add ".js" (Node ESM requirement).
run("node", ["scripts/rewrite-esm-imports.js"], "2/3");
// 3. Bundle the CLI entrypoint (esbuild, inlines core).
run("npm", ["run", "bundle"], "3/3");

console.log("\n✅  Build complete.\n\n");
