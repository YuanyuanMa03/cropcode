import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptsDir, "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cropcode-distribution-test-"));

try {
  const archive = resolveArchive();
  assert.ok(existsSync(archive), `Missing distribution archive: ${archive}`);

  const extractRoot = path.join(tempRoot, "extract");
  const installRoot = path.join(tempRoot, "install root");
  const binRoot = path.join(tempRoot, "bin root");
  const testHome = path.join(tempRoot, "user home");
  const settingsDir = path.join(testHome, ".cropcode");
  await mkdir(extractRoot, { recursive: true });
  await mkdir(settingsDir, { recursive: true });
  await writeFile(path.join(settingsDir, "settings.json"), '{"sentinel":"preserve"}\n');

  extract(archive, extractRoot);
  const packageDir = await findPackageDirectory(extractRoot);
  const installer = path.join(packageDir, process.platform === "win32" ? "install.ps1" : "install.sh");
  const env = {
    ...process.env,
    HOME: testHome,
    USERPROFILE: testHome,
    PATH: systemPath(),
    CROPCODE_INSTALL_DIR: installRoot,
    CROPCODE_BIN_DIR: binRoot,
  };
  const systemNode = spawnSync("node", ["--version"], { env, stdio: "pipe" });
  assert.notEqual(systemNode.status, 0, "Distribution test PATH unexpectedly contains Node.js.");

  install(installer, env);
  assert.equal((await readFile(path.join(installRoot, "current-version"), "utf8")).trim(), version);
  assert.ok(existsSync(path.join(installRoot, "versions", version)));
  assert.equal(JSON.parse(await readFile(path.join(settingsDir, "settings.json"), "utf8")).sentinel, "preserve");

  const launcher =
    process.platform === "win32" ? path.join(installRoot, "cropcode.cmd") : path.join(binRoot, "cropcode");
  const launcherSource = await readFile(launcher, "utf8");
  if (process.platform === "win32") {
    assert.match(launcherSource, /CROPCODE_DISTRIBUTION=portable/);
  } else {
    assert.match(launcherSource, /CROPCODE_BIN_DIR="\$BIN_ROOT"/);
  }
  const launchedVersion = launchVersion(launcher, env);
  assert.equal(launchedVersion, version);

  await writeFile(path.join(installRoot, "current-version"), "1.0.0\n");
  install(installer, env);
  assert.equal((await readFile(path.join(installRoot, "previous-version"), "utf8")).trim(), "1.0.0");
  assert.equal((await readFile(path.join(installRoot, "current-version"), "utf8")).trim(), version);
  assert.equal(JSON.parse(await readFile(path.join(settingsDir, "settings.json"), "utf8")).sentinel, "preserve");

  if (process.platform !== "win32") {
    const bootstrapInstallRoot = path.join(tempRoot, "bootstrap-install");
    const bootstrapBinRoot = path.join(tempRoot, "bootstrap-bin");
    run("sh", [path.join(root, "install.sh")], {
      env: {
        ...env,
        CROPCODE_INSTALL_DIR: bootstrapInstallRoot,
        CROPCODE_BIN_DIR: bootstrapBinRoot,
        CROPCODE_DOWNLOAD_BASE: pathToFileURL(path.join(root, "release")).href,
      },
    });
    assert.equal((await readFile(path.join(bootstrapInstallRoot, "current-version"), "utf8")).trim(), version);
    const bootstrapVersion = run(path.join(bootstrapBinRoot, "cropcode"), ["--version"], {
      env,
      encoding: "utf8",
    }).stdout.trim();
    assert.equal(bootstrapVersion, version);
  }

  process.stdout.write(`Distribution install test passed for CropCode ${version}.\n`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

function resolveArchive() {
  if (process.platform === "darwin") return path.join(root, "release", "cropcode-macos-universal.tar.gz");
  if (process.platform === "linux" && process.arch === "x64") {
    return path.join(root, "release", "cropcode-linux-x64.tar.gz");
  }
  if (process.platform === "win32" && process.arch === "x64") {
    return path.join(root, "release", "cropcode-windows-x64.zip");
  }
  throw new Error(`No distribution install test for ${process.platform}-${process.arch}.`);
}

function extract(archive, destination) {
  if (process.platform === "win32") {
    run("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      archive,
      destination,
    ]);
    return;
  }
  run("tar", ["-xzf", archive, "-C", destination]);
}

async function findPackageDirectory(extractRoot) {
  const entries = await readdir(extractRoot, { withFileTypes: true });
  const directory = entries.find((entry) => entry.isDirectory() && entry.name.startsWith("cropcode-v"));
  assert.ok(directory, "Distribution archive does not contain a CropCode package directory.");
  return path.join(extractRoot, directory.name);
}

function install(installer, env) {
  if (process.platform === "win32") {
    run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installer], { env });
    return;
  }
  run("sh", [installer], { env });
}

function launchVersion(launcher, env) {
  if (process.platform === "win32") {
    return run(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", "& $env:CROPCODE_TEST_LAUNCHER --version"],
      {
        env: { ...env, CROPCODE_TEST_LAUNCHER: launcher },
        encoding: "utf8",
      }
    ).stdout.trim();
  }
  return run(launcher, ["--version"], { env, encoding: "utf8" }).stdout.trim();
}

function systemPath() {
  if (process.platform !== "win32") return "/usr/bin:/bin";
  const windowsRoot = process.env.SystemRoot || "C:\\Windows";
  return [
    path.join(windowsRoot, "System32"),
    windowsRoot,
    path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0"),
  ].join(path.delimiter);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "pipe", ...options });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} failed:\n${String(result.stderr ?? "")}`);
  return result;
}
