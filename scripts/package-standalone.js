import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "scripts/standalone/platforms.json"), "utf8"));
const target = `${process.platform}-${process.arch}`;
const platform = config.platforms.find((entry) => entry.target === target);
if (!platform) throw new Error(`Unsupported standalone target: ${target}`);
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const release = join(root, "release");
const sourcePackage = join(release, `cropcode-cli-${version}.tgz`);
if (!existsSync(sourcePackage)) throw new Error("Run npm run package:cli first.");
const temporary = mkdtempSync(join(tmpdir(), "cropcode-standalone-build-"));
const payload = join(temporary, "cropcode");
mkdirSync(payload);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`${command} failed (${result.status})`);
}

try {
  // Runtime archives are pinned by version AND digest, not selected at install time.
  const archive = join(temporary, platform.nodeAsset);
  run("curl", [
    "-fSL",
    "--retry",
    "3",
    "--max-time",
    "300",
    `https://nodejs.org/dist/v${config.nodeVersion}/${platform.nodeAsset}`,
    "-o",
    archive,
  ]);
  const hash = createHash("sha256").update(readFileSync(archive)).digest("hex");
  if (hash !== platform.sha256) throw new Error("Node.js runtime checksum mismatch.");
  run("tar", ["-xf", archive, "-C", temporary]);
  const extracted = join(temporary, platform.nodeAsset.replace(/\.(zip|tar\.gz)$/, ""));
  renameSync(extracted, join(payload, "runtime"));
  const runtime = join(payload, "runtime", process.platform === "win32" ? "node.exe" : "bin/node");
  const npm = join(
    payload,
    "runtime",
    process.platform === "win32" ? "node_modules/npm/bin/npm-cli.js" : "lib/node_modules/npm/bin/npm-cli.js"
  );
  const app = join(payload, "app");
  mkdirSync(app);
  writeFileSync(join(app, "package.json"), JSON.stringify({ name: "cropcode-standalone", private: true, version }));
  const npmrc = join(temporary, "build.npmrc");
  const globalNpmrc = join(temporary, "global.npmrc");
  writeFileSync(npmrc, "");
  writeFileSync(globalNpmrc, "");
  const buildEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith("npm_config_"))
  );
  run(
    runtime,
    [
      npm,
      "install",
      "--prefix",
      app,
      "--userconfig",
      npmrc,
      "--globalconfig",
      globalNpmrc,
      "--omit=dev",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      sourcePackage,
    ],
    { env: buildEnv }
  );
  // Exercise the real native addon on this architecture before packaging it.
  run(
    runtime,
    [
      "--input-type=module",
      "-e",
      'import sharp from "sharp"; await sharp({create:{width:1,height:1,channels:4,background:"green"}}).png().toBuffer(); console.log("Native image processing verified");',
    ],
    { cwd: app }
  );
  for (const file of ["LICENSE", "uninstall.sh", "uninstall.ps1"]) cpSync(join(root, file), join(payload, file));
  cpSync(join(root, "scripts/standalone/cropcode.sh"), join(payload, "cropcode"));
  cpSync(join(root, "scripts/standalone/cropcode.cmd"), join(payload, "cropcode.cmd"));
  chmodSync(join(payload, "cropcode"), 0o755);
  writeFileSync(
    join(payload, "manifest.json"),
    JSON.stringify({ product: "CropCode", version, target, nodeVersion: config.nodeVersion }, null, 2) + "\n"
  );
  run(runtime, [join(app, "node_modules/@yuanyuanma03/cropcode-cli/cli.js"), "--version"]);
  const extension = process.platform === "win32" ? "zip" : "tar.gz";
  const output = join(release, `cropcode-${version}-${target}.${extension}`);
  if (process.platform === "win32") {
    run("tar", ["-a", "-cf", output, "-C", temporary, "cropcode"]);
  } else {
    run("tar", ["-czf", output, "-C", temporary, "cropcode"]);
  }
  console.log(output);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
