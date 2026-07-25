import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// On Windows, npm is a .cmd shim and must be invoked via its full name.
// Avoid shell:true entirely — passing args with shell triggers DEP0190
// and leaves arguments unescaped.
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, label) {
  process.stdout.write(`\n[${label}] ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, { stdio: "inherit", cwd: root });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("=========================================");
console.log("  CropCode CLI — Build");
console.log("=========================================");

// 1. Build the core library (tsc emits dist/ with declarations).
run(npmCmd, ["run", "build", "--workspace=@YuanyuanMa03/cropcode-core"], "1/3");
// 2. Rewrite extensionless relative imports in core/dist to add ".js" (Node ESM requirement).
run("node", ["scripts/rewrite-esm-imports.js"], "2/3");
// 3. Bundle the CLI entrypoint (esbuild, inlines core).
run(npmCmd, ["run", "bundle"], "3/3");

console.log("\n✅  Build complete.\n\n");
