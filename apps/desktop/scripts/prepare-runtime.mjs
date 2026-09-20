// Copies the standalone CropCode runtime into resources/cropcode so
// electron-builder bundles it as extraResources. The standalone package is
// self-contained (private Node runtime + dependencies); dev mode does not
// need this step.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..");
const releaseDir = join(repoRoot, "release");
const target = `${process.platform}-${process.arch}`;

const version = JSON.parse(readFileSync(join(appRoot, "package.json"))).version;
const candidates = [join(releaseDir, `cropcode-${version}-${target}`)];
// Freshly built standalone archives are unpacked as release/cropcode-<version>-<target>/
// Fall back to the newest unpacked directory for the current platform.
if (existsSync(releaseDir)) {
  for (const entry of readdirSync(releaseDir)) {
    if (entry.startsWith(`cropcode-`) && entry.endsWith(target) && !candidates.some((c) => c.endsWith(entry))) {
      candidates.push(join(releaseDir, entry));
    }
  }
}

const found = candidates.find((candidate) => existsSync(candidate));
if (!found) {
  console.error(
    `未找到独立运行时目录(期望 release/cropcode-${version}-${target})。\n` +
      `先运行:npm run package:standalone,并解压产物到 release/ 下再打包桌面端。`
  );
  process.exit(1);
}

const destination = join(appRoot, "resources", "cropcode");
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(found, destination, { recursive: true });
console.log(`✓ runtime copied: ${found} -> ${destination.replace(repoRoot + "/", "")}`);
