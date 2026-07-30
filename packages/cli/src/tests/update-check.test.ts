import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compareVersions,
  getManifestUrl,
  getReleaseAssetUrl,
  parseReleaseManifest,
  resolveReleaseTarget,
  rollbackInstalledVersion,
  type ReleaseManifest,
} from "../common/update-check";

const manifest: ReleaseManifest = {
  schemaVersion: 1,
  version: "2.2.0",
  publishedAt: "2026-08-01T00:00:00.000Z",
  releaseNotesUrl: "https://github.com/YuanyuanMa03/cropcode/releases/tag/v2.2.0",
  assets: {
    "macos-universal": {
      file: "cropcode-macos-universal.tar.gz",
      sha256: "a".repeat(64),
      size: 123,
    },
  },
};

test("compareVersions orders stable semantic versions", () => {
  assert.equal(compareVersions("2.1.0", "2.0.9"), 1);
  assert.equal(compareVersions("2.2.0", "2.10.0"), -1);
  assert.equal(compareVersions("2.1.0", "2.1.0"), 0);
  assert.throws(() => compareVersions("2.1.0-beta.1", "2.1.0"), /Invalid CropCode version/);
});

test("parseReleaseManifest accepts supported assets", () => {
  assert.deepEqual(parseReleaseManifest(manifest), manifest);
});

test("parseReleaseManifest rejects unsafe files and hashes", () => {
  assert.throws(
    () =>
      parseReleaseManifest({
        ...manifest,
        assets: { "macos-universal": { ...manifest.assets["macos-universal"], file: "../cropcode.tar.gz" } },
      }),
    /Invalid CropCode release asset/
  );
  assert.throws(
    () =>
      parseReleaseManifest({
        ...manifest,
        assets: { "macos-universal": { ...manifest.assets["macos-universal"], sha256: "not-a-hash" } },
      }),
    /Invalid CropCode release asset/
  );
});

test("resolveReleaseTarget maps supported operating systems", () => {
  assert.equal(resolveReleaseTarget("darwin", "arm64"), "macos-universal");
  assert.equal(resolveReleaseTarget("darwin", "x64"), "macos-universal");
  assert.equal(resolveReleaseTarget("linux", "x64"), "linux-x64");
  assert.equal(resolveReleaseTarget("win32", "x64"), "windows-x64");
  assert.throws(() => resolveReleaseTarget("linux", "arm64"), /does not provide a release/);
});

test("release URLs use GitHub by default and honor a mirror base", () => {
  const asset = manifest.assets["macos-universal"]!;
  assert.equal(getManifestUrl({}), "https://github.com/YuanyuanMa03/cropcode/releases/latest/download/manifest.json");
  assert.equal(
    getReleaseAssetUrl(manifest, asset, {}),
    "https://github.com/YuanyuanMa03/cropcode/releases/download/v2.2.0/cropcode-macos-universal.tar.gz"
  );
  assert.equal(
    getManifestUrl({ CROPCODE_DOWNLOAD_BASE: "https://mirror.example/releases/" }),
    "https://mirror.example/releases/manifest.json"
  );
  assert.equal(
    getReleaseAssetUrl(manifest, asset, { CROPCODE_DOWNLOAD_BASE: "https://mirror.example/releases/" }),
    "https://mirror.example/releases/cropcode-macos-universal.tar.gz"
  );
});

test("rollbackInstalledVersion atomically swaps current and previous versions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cropcode-rollback-test-"));
  try {
    const previousVersion = "2.1.0";
    const currentVersion = "2.2.0";
    const launcher = path.join(
      root,
      "versions",
      previousVersion,
      process.platform === "win32" ? "cropcode.cmd" : "cropcode"
    );
    await mkdir(path.dirname(launcher), { recursive: true });
    await writeFile(launcher, "launcher\n");
    await writeFile(path.join(root, "current-version"), `${currentVersion}\n`);
    await writeFile(path.join(root, "previous-version"), `${previousVersion}\n`);

    assert.deepEqual(await rollbackInstalledVersion(root), { currentVersion, previousVersion });
    assert.equal((await readFile(path.join(root, "current-version"), "utf8")).trim(), previousVersion);
    assert.equal((await readFile(path.join(root, "previous-version"), "utf8")).trim(), currentVersion);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
