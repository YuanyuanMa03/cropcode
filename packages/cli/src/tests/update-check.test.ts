import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { syncBuiltinESMExports } from "node:module";
import {
  UPDATE_SUCCESS_MESSAGE,
  compareVersions,
  parseNpmViewVersion,
  promptForPendingUpdate,
  checkForNpmUpdate,
} from "../common/update-check";

test("compareVersions orders semantic versions", () => {
  assert.equal(compareVersions("0.1.4", "0.1.3"), 1);
  assert.equal(compareVersions("0.2.0", "0.10.0"), -1);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.0.0", "1.0.0-beta.1"), 0);
});

test("parseNpmViewVersion parses npm view JSON and plain output", () => {
  assert.equal(parseNpmViewVersion('"0.1.4"\n'), "0.1.4");
  assert.equal(parseNpmViewVersion("0.1.5\n"), "0.1.5");
  assert.equal(parseNpmViewVersion("\n"), null);
});

test("UPDATE_SUCCESS_MESSAGE tells the user to restart CropCode", () => {
  assert.equal(UPDATE_SUCCESS_MESSAGE, "🎉 Update ran successfully! Please restart CropCode.");
});

test("standalone installs skip npm update checks and saved update prompts", async (t) => {
  const previous = process.env.CROPCODE_INSTALL_METHOD;
  process.env.CROPCODE_INSTALL_METHOD = "standalone";
  const home = t.mock.method(os, "homedir", () => {
    throw new Error("Standalone updates must not read npm update state");
  });
  syncBuiltinESMExports();
  try {
    const packageInfo = {
      get name(): string {
        throw new Error("Must not query the npm registry");
      },
      get version(): string {
        throw new Error("Must not offer an npm update");
      },
    };
    assert.deepEqual(await promptForPendingUpdate(packageInfo), { installed: false });
    await checkForNpmUpdate(packageInfo);
    assert.equal(home.mock.callCount(), 0);
  } finally {
    home.mock.restore();
    syncBuiltinESMExports();
    if (previous === undefined) delete process.env.CROPCODE_INSTALL_METHOD;
    else process.env.CROPCODE_INSTALL_METHOD = previous;
  }
});
