import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { buildSidecarSpec, parseWebHostUrl, resolveCliEntry } from "../sidecar.js";

test("buildSidecarSpec re-uses the Electron binary as the Node runtime", () => {
  const spec = buildSidecarSpec({
    electronExecutable: "/Applications/CropCode.app/Contents/MacOS/CropCode",
    cliEntry: "/repo/packages/cli/dist/cli.js",
    port: 0,
    env: { PATH: "/usr/bin" },
  });
  assert.equal(spec.command, "/Applications/CropCode.app/Contents/MacOS/CropCode");
  assert.deepEqual(spec.args, ["/repo/packages/cli/dist/cli.js", "web", "--port", "0"]);
  assert.equal(spec.env.ELECTRON_RUN_AS_NODE, "1");
  assert.equal(spec.env.ELECTRON_NO_ATTACH_CONSOLE, "1");
  assert.equal(spec.env.PATH, "/usr/bin");
});

test("parseWebHostUrl extracts the tokened local URL from host output", () => {
  const stdout = `
CropCode Web · /repo

http://127.0.0.1:8917/#token=fe111cbdb13ea167371e291833c5c44fc365d94235f96addf266811999adc279

在浏览器打开以上地址。Ctrl+C 停止本地服务。
`;
  assert.equal(
    parseWebHostUrl(stdout),
    "http://127.0.0.1:8917/#token=fe111cbdb13ea167371e291833c5c44fc365d94235f96addf266811999adc279"
  );
  // Partial or hostile output never yields a URL.
  assert.equal(parseWebHostUrl("http://127.0.0.1:8917/#token=SHORT"), null);
  assert.equal(parseWebHostUrl("http://127.0.0.1:8917/"), null);
  assert.equal(parseWebHostUrl("http://example.invalid/#token=abcdef0123456789"), null);
  // The URL can be found mid-stream (chunked stdout).
  const token = "a".repeat(64);
  assert.equal(
    parseWebHostUrl("noise\nhttp://127.0.0.1:8787/#token=" + token + "\nmore"),
    "http://127.0.0.1:8787/#token=" + token
  );
});

test("resolveCliEntry prefers the packaged copy and falls back to the dev build", () => {
  assert.equal(resolveCliEntry("/nonexistent-repo", "/nonexistent-packaged/cli.js"), null);
  // Tests run from src/tests (one level deeper than the compiled dist layout).
  const here = new URL(".", import.meta.url).pathname;
  const repo = join(here, "..", "..", "..", "..");
  assert.ok(resolveCliEntry(repo, null)?.endsWith(join("packages", "cli", "dist", "cli.js")));
});
