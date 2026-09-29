import { readFileSync, writeFileSync } from "node:fs";
import semver from "semver";
const version = process.argv[2];
if (!version || !semver.valid(version)) throw new Error("请提供有效版本号，例如 2.0.0-alpha.1");
for (const manifest of ["../package.json", "../apps/zcode-cli/package.json"]) {
  const path = new URL(manifest, import.meta.url);
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
}
console.log(`CropCode ${version}（仅更新本地版本，不发布）`);
