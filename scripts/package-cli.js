import { copyFileSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "packages/cli/dist");
const release = join(root, "release");
const cli = JSON.parse(readFileSync(join(root, "packages/cli/package.json"), "utf8"));
const core = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8"));
mkdirSync(release, { recursive: true });
for (const file of ["README.md", "LICENSE"]) copyFileSync(join(root, file), join(dist, file));
// Match the upstream distribution layout: inline JS, external platform-specific Sharp.
writeFileSync(
  join(dist, "package.json"),
  JSON.stringify(
    {
      name: cli.name,
      version: cli.version,
      description: cli.description,
      license: cli.license,
      type: "module",
      main: "cli.js",
      bin: { cropcode: "cli.js" },
      files: ["cli.js", "chunks/**", "templates/**", "bundled/**", "README.md", "LICENSE"],
      engines: cli.engines,
      repository: cli.repository,
      homepage: cli.homepage,
      dependencies: { sharp: core.dependencies.sharp },
    },
    null,
    2
  ) + "\n"
);
const result = spawnSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", release], {
  cwd: dist,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || "npm pack failed\n");
  process.exit(result.status ?? 1);
}
const [{ filename }] = JSON.parse(result.stdout);
const target = join(release, `cropcode-cli-${cli.version}.tgz`);
renameSync(join(release, filename), target);
console.log(target);
