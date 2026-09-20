import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const runtimeVersion = JSON.parse(readFileSync(join(root, "scripts/standalone/platforms.json"), "utf8")).nodeVersion;
const windows = process.platform === "win32";
const target = `${process.platform}-${process.arch}`;
const asset = `cropcode-${version}-${target}.${windows ? "zip" : "tar.gz"}`;
const temporary = mkdtempSync(join(tmpdir(), "cropcode-standalone-test-"));
const prefix = join(temporary, "install with spaces");
const release = join(temporary, "release");
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"));
delete env.CROPCODE_INSTALL_PREFIX;
let shell;
try {
  mkdirSync(release);
  cpSync(join(root, "release", asset), join(release, asset));
  const checksum = createHash("sha256")
    .update(readFileSync(join(release, asset)))
    .digest("hex");
  const sums = `${checksum}  ${asset}\n`;
  writeFileSync(join(release, "SHA256SUMS"), sums);
  writeFileSync(join(temporary, "keep.txt"), "unrelated project data");
  if (windows) {
    // PowerShell 7 exports its module path; Windows PowerShell 5.1 needs its own defaults.
    for (const key of Object.keys(env)) if (key.toLowerCase() === "psmodulepath") delete env[key];
    shell = join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe");
    env.PATH = join(process.env.SystemRoot, "System32");
  } else {
    shell = "/bin/sh";
    const tools = join(temporary, "system-tools");
    mkdirSync(tools);
    for (const tool of [
      "tar",
      "gzip",
      "awk",
      "grep",
      "mktemp",
      "cp",
      "mv",
      "mkdir",
      "rm",
      "rmdir",
      "ln",
      "readlink",
      "dirname",
      "cat",
      "sha256sum",
      "shasum",
      "uname",
      "ldd",
      "sed",
      "head",
      "cut",
    ]) {
      const found = spawnSync("/bin/sh", ["-c", `command -v ${tool}`], { encoding: "utf8" });
      if (found.status === 0 && existsSync(found.stdout.trim())) symlinkSync(found.stdout.trim(), join(tools, tool));
    }
    env.PATH = tools;
  }
  assert.equal(
    spawnSync("node", ["--version"], { env }).error?.code,
    "ENOENT",
    "test environment must not have system Node.js"
  );
  const installerArgs = windows
    ? [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(root, "install.ps1"),
        "-Version",
        version,
        "-Prefix",
        prefix,
        "-FromRelease",
        release,
      ]
    : [join(root, "install.sh"), version, "--prefix", prefix, "--from-release", release];
  const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, { env, encoding: "utf8", timeout: 120000, ...options });
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    assert.equal(result.status, 0, result.error?.message ?? `${command} failed`);
    return result.stdout.trim();
  };
  run(shell, installerArgs);
  const bundlePath = () =>
    windows
      ? join(prefix, "releases", readdirSync(join(prefix, "releases")).sort().at(-1))
      : realpathSync(join(prefix, "share/cropcode/current"));
  const original = bundlePath();
  const runtime = join(original, "runtime", windows ? "node.exe" : "bin/node");
  assert.equal(run(runtime, ["--version"]), `v${runtimeVersion}`);
  if (windows) {
    run(process.env.ComSpec, ["/d", "/s", "/c", `""${join(prefix, "bin/cropcode.cmd")}" --version"`], {
      windowsVerbatimArguments: true,
    });
    run(process.env.ComSpec, ["/d", "/s", "/c", `""${join(prefix, "bin/cropcode.cmd")}" --help"`], {
      windowsVerbatimArguments: true,
    });
  } else {
    assert.equal(run(join(prefix, "bin/cropcode"), ["--version"]), version);
    run(join(prefix, "bin/cropcode"), ["--help"]);
  }
  run(
    runtime,
    [
      "--input-type=module",
      "-e",
      'import sharp from "sharp"; const buffer=await sharp({create:{width:2,height:2,channels:4,background:"green"}}).png().toBuffer(); if((await sharp(buffer).metadata()).width!==2) process.exit(1); console.log("Installed native image processing verified");',
    ],
    { cwd: join(original, "app") }
  );
  const launcher = windows ? join(prefix, "bin/cropcode.cmd") : join(prefix, "share/cropcode/current");
  const current = () => (windows ? readFileSync(launcher, "utf8") : realpathSync(launcher));
  const before = current();
  writeFileSync(join(release, "SHA256SUMS"), `${"0".repeat(64)}  ${asset}\n`);
  const failed = spawnSync(shell, installerArgs, { env, encoding: "utf8", timeout: 120000 });
  assert.notEqual(failed.status, 0, "corrupted update must fail");
  assert.equal(current(), before, "failed update must preserve active launcher");
  writeFileSync(join(release, "SHA256SUMS"), sums);
  run(shell, installerArgs);
  assert.notEqual(current(), before, "successful update must select the newly verified bundle");
  const uninstallArgs = windows
    ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(prefix, "uninstall.ps1"), "-Prefix", prefix]
    : [join(prefix, "share/cropcode/uninstall.sh"), "--prefix", prefix];
  run(shell, uninstallArgs);
  assert.ok(!existsSync(windows ? prefix : join(prefix, "share/cropcode")));
  assert.equal(readFileSync(join(temporary, "keep.txt"), "utf8"), "unrelated project data");
  // Verify the alternative npm route too, using an isolated global prefix.
  const npmPrefix = join(temporary, "npm install with spaces");
  const npmCLI = process.env.npm_execpath;
  assert.ok(npmCLI, "Run this check via npm run test:standalone.");
  run(
    process.execPath,
    [
      npmCLI,
      "install",
      "--global",
      "--prefix",
      npmPrefix,
      "--no-audit",
      "--no-fund",
      join(root, "release", `cropcode-cli-${version}.tgz`),
    ],
    { env: process.env }
  );
  const npmEntry = join(npmPrefix, windows ? "node_modules" : "lib/node_modules", "@yuanyuanma03/cropcode-cli/cli.js");
  assert.equal(run(process.execPath, [npmEntry, "--version"], { env: process.env }), version);
  run(process.execPath, [npmCLI, "uninstall", "--global", "--prefix", npmPrefix, "@yuanyuanma03/cropcode-cli"], {
    env: process.env,
  });
  assert.ok(!existsSync(npmEntry));
  console.log(
    `PASS ${target}: no-system-Node install, CLI, native addon, failed update, successful update, uninstall, npm install/uninstall.`
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
