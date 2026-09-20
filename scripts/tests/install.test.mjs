import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, cpSync, readlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const installer = join(root, "install.sh");
const shellTest = (name, fn) => test(name, { skip: process.platform === "win32" }, fn);

// Tiny executable fixtures test installer transactions. Real platform packages are tested separately in CI.
function fixture(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cropcode-installer-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const tools = join(dir, "tools");
  const prefix = join(dir, "prefix with spaces");
  const release = join(dir, "release");
  const bundle = join(dir, "cropcode");
  const downloads = join(dir, "downloads");
  const nodeCalls = join(dir, "unexpected-node-call");
  const target = `${options.platform ?? "linux"}-${options.arch ?? "x64"}`;
  const asset = `cropcode-1.1.0-${target}.tar.gz`;
  for (const path of [tools, release, join(bundle, "runtime/bin")]) mkdirSync(path, { recursive: true });
  const executable = (path, source) => writeFileSync(path, source, { mode: 0o755 });
  executable(join(bundle, "runtime/bin/node"), `#!/bin/sh\nexec '${process.execPath.replace(/'/g, "'\\''")}' "$@"\n`);
  executable(join(bundle, "cropcode"), options.badCLI ? "#!/bin/sh\nexit 1\n" : "#!/bin/sh\nprintf '1.1.0\\n'\n");
  writeFileSync(
    join(bundle, "manifest.json"),
    JSON.stringify({ product: "CropCode", version: options.manifestVersion ?? "1.1.0", target })
  );
  cpSync(join(root, "uninstall.sh"), join(bundle, "uninstall.sh"));
  const packed = spawnSync("tar", ["-czf", join(release, asset), "-C", dir, "cropcode"]);
  assert.equal(packed.status, 0);
  const hash = createHash("sha256")
    .update(readFileSync(join(release, asset)))
    .digest("hex");
  writeFileSync(
    join(release, "SHA256SUMS"),
    `${options.badHash ? "0".repeat(64) : hash}  ${options.missingHash ? "other.tar.gz" : asset}\n`
  );
  executable(
    join(tools, "curl"),
    `#!${process.execPath}
const fs = require('node:fs'); const path = require('node:path');
const args = process.argv.slice(2); const url = args.find(a=>a.startsWith('https://'));
fs.appendFileSync(${JSON.stringify(downloads)}, url+'\\n');
if (${Boolean(options.downloadFailure)}) process.exit(22);
if (url.endsWith('/latest')) process.stdout.write(${JSON.stringify(`https://github.com/YuanyuanMa03/cropcode/releases/tag/${options.tag ?? "v1.1.0"}`)});
else fs.copyFileSync(path.join(${JSON.stringify(release)},url.split('/').at(-1)),args[args.indexOf('--output')+1]);
`
  );
  executable(
    join(tools, "uname"),
    `#!/bin/sh\ncase "$1" in -s) echo '${options.platform === "darwin" ? "Darwin" : options.platform === "windows" ? "MINGW64_NT" : "Linux"}' ;; *) echo '${options.arch === "arm64" ? "aarch64" : options.arch === "bad" ? "riscv64" : "x86_64"}' ;; esac\n`
  );
  executable(join(tools, "ldd"), `#!/bin/sh\necho '${options.musl ? "musl libc" : "glibc 2.36"}'\n`);
  for (const name of ["node", "npm"])
    executable(join(tools, name), `#!/bin/sh\necho unexpected > '${nodeCalls}'\nexit 99\n`);
  const env = { ...process.env, PATH: `${tools}:/usr/bin:/bin`, CROPCODE_INSTALL_PREFIX: prefix };
  const run = (args = [], pipe = false) =>
    spawnSync("/bin/sh", pipe ? ["-s", "--", ...args] : [installer, ...args], {
      env,
      encoding: "utf8",
      timeout: 20000,
      ...(pipe ? { input: readFileSync(installer, "utf8") } : {}),
    });
  return { run, prefix, release, downloads, nodeCalls, env };
}

shellTest("piped latest installation uses the bundled runtime, supports spaces and uninstalls", (t) => {
  const f = fixture(t);
  const result = f.run([], true);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!existsSync(f.nodeCalls), "system node/npm must never run");
  assert.match(result.stdout, /export PATH='/);
  assert.equal(readFileSync(f.downloads, "utf8").trim().split("\n").length, 3);
  const command = join(f.prefix, "bin/cropcode");
  assert.equal(readlinkSync(command), join(f.prefix, "share/cropcode/current/cropcode"));
  const uninstall = spawnSync("/bin/sh", [join(f.prefix, "share/cropcode/uninstall.sh"), "--prefix", f.prefix], {
    env: f.env,
    encoding: "utf8",
  });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  assert.ok(!existsSync(join(f.prefix, "share/cropcode")));
  assert.ok(!existsSync(command));
});

shellTest("local release installation skips the network and supports ARM64", (t) => {
  const f = fixture(t, { platform: "darwin", arch: "arm64" });
  const result = f.run(["v1.1.0", "--from-release", f.release]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!existsSync(f.downloads));
  assert.ok(!existsSync(f.nodeCalls));
});

shellTest("failed update preserves the active version; successful update changes the pointer", (t) => {
  const f = fixture(t);
  assert.equal(f.run(["1.1.0"]).status, 0);
  const current = join(f.prefix, "share/cropcode/current");
  const before = readlinkSync(current);
  const checksums = readFileSync(join(f.release, "SHA256SUMS"));
  writeFileSync(join(f.release, "SHA256SUMS"), "invalid\n");
  assert.notEqual(f.run(["1.1.0"]).status, 0);
  assert.equal(readlinkSync(current), before);
  writeFileSync(join(f.release, "SHA256SUMS"), checksums);
  assert.equal(f.run(["1.1.0"]).status, 0);
  assert.notEqual(readlinkSync(current), before);
});

for (const [label, options, message] of [
  ["corrupted payload", { badHash: true }, /SHA-256 verification failed/],
  ["missing checksum", { missingHash: true }, /checksum entry/],
  ["failed download", { downloadFailure: true }, /Could not resolve/],
  ["invalid tag", { tag: "../../unexpected" }, /Unexpected release redirect/],
  ["wrong manifest", { manifestVersion: "9.9.9" }, /manifest does not match/],
  ["CLI startup failure", { badCLI: true }, /new CLI could not start/],
  ["native Windows shell", { platform: "windows" }, /install.ps1/],
  ["unsupported architecture", { arch: "bad" }, /Supported architectures/],
  ["musl platform", { musl: true }, /glibc 2.28/],
]) {
  shellTest(`${label} leaves no installed command`, (t) => {
    const f = fixture(t, options);
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
    assert.ok(!existsSync(join(f.prefix, "bin/cropcode")));
    assert.ok(!existsSync(f.nodeCalls));
  });
}

shellTest("existing external commands are preserved", (t) => {
  const f = fixture(t);
  mkdirSync(join(f.prefix, "bin"), { recursive: true });
  const command = join(f.prefix, "bin/cropcode");
  writeFileSync(command, "owned by another installation");
  const result = f.run(["1.1.0"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Another installation owns/);
  assert.equal(readFileSync(command, "utf8"), "owned by another installation");
});

shellTest("uninstaller refuses unmanaged data", (t) => {
  const f = fixture(t);
  const directory = join(f.prefix, "share/cropcode");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "keep"), "user data");
  const result = spawnSync("/bin/sh", [join(root, "uninstall.sh"), "--prefix", f.prefix], {
    env: f.env,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.ok(existsSync(join(directory, "keep")));
});

shellTest("help and invalid arguments do not access the network", (t) => {
  for (const args of [["--help"], ["--unknown"], ["--prefix"], ["--prefix", "relative"], ["1.1.0", "1.2.0"]]) {
    const f = fixture(t);
    const result = f.run(args);
    assert.equal(result.status === 0, args[0] === "--help");
    assert.ok(!existsSync(f.downloads));
  }
});
