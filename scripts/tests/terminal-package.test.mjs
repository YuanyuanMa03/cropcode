import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const name = `CropCode-${version}-${process.platform}-${process.arch}`;

test("standalone terminal archive boots its native TUI renderer without workspace modules", () => {
  const directory = mkdtempSync(join(tmpdir(), "cropcode-terminal-"));
  try {
    const archive = join(root, "release", `${name}-terminal.tar.gz`);
    const extracted = spawnSync("tar", ["-xzf", archive, "-C", directory], {
      encoding: "utf8",
    });
    assert.equal(extracted.status, 0, extracted.stderr);

    const packageRoot = join(directory, name);
    const launcher = join(packageRoot, "bin", "cropcode");
    const runtime = join(packageRoot, "runtime");
    const versionResult = spawnSync(launcher, ["--version"], { encoding: "utf8" });
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout.trim(), version);

    const rendererResult = spawnSync(
      join(runtime, "node"),
      [
        "--input-type=module",
        "-e",
        "import('@mbears/opentui-core').then((module) => module.resolveRenderLib())",
      ],
      { cwd: runtime, encoding: "utf8" },
    );
    assert.equal(rendererResult.status, 0, rendererResult.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
