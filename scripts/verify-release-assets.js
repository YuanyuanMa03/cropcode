import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const { platforms } = JSON.parse(readFileSync(join(root, "scripts/standalone/platforms.json"), "utf8"));
const expected = [
  `cropcode-cli-${version}.tgz`,
  `cropcode-vscode-${version}.vsix`,
  "install.sh",
  "uninstall.sh",
  "install.ps1",
  "uninstall.ps1",
  ...platforms.map(({ target }) => `cropcode-${version}-${target}.${target.startsWith("win32") ? "zip" : "tar.gz"}`),
];
for (const file of expected) {
  if (!existsSync(join(root, "release", file))) throw new Error(`Missing release asset: ${file}`);
}
console.log(`All ${expected.length} required release assets are present.`);

if (process.argv.includes("--uploaded")) {
  const result = spawnSync(
    "gh",
    ["release", "view", `v${version}`, "--repo", "YuanyuanMa03/cropcode", "--json", "isDraft,assets"],
    { encoding: "utf8" }
  );
  if (result.status !== 0) throw new Error(result.stderr || "Could not inspect uploaded release assets.");
  const release = JSON.parse(result.stdout);
  if (!release.isDraft) throw new Error("Only an unpublished draft may pass the upload verification gate.");
  for (const name of [...expected, "SHA256SUMS"]) {
    const asset = release.assets.find((entry) => entry.name === name);
    const content = readFileSync(join(root, "release", name));
    const digest = `sha256:${createHash("sha256").update(content).digest("hex")}`;
    if (!asset || asset.state !== "uploaded" || asset.size !== content.length || asset.digest !== digest) {
      throw new Error(`Incomplete or mismatched uploaded asset: ${name}`);
    }
  }
  console.log("Uploaded draft assets match all local sizes and SHA-256 digests.");
}
