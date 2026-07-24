import { createHash } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { chmod, copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptsDir, "..");
const releaseDir = path.join(root, "release");
const workDir = path.join(releaseDir, ".work");
const cacheDir = path.join(releaseDir, ".cache");
const nodeVersion = process.env.CROPCODE_NODE_VERSION || "22.23.1";
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;

const targets = {
  "windows-x64": {
    output: "cropcode-windows-x64.zip",
    runtimes: [{ archivePlatform: "win-x64", destination: "runtime/node.exe" }],
    windows: true,
  },
  "macos-universal": {
    output: "cropcode-macos-universal.tar.gz",
    runtimes: [
      { archivePlatform: "darwin-arm64", destination: "runtime/arm64/node" },
      { archivePlatform: "darwin-x64", destination: "runtime/x64/node" },
    ],
  },
  "linux-x64": {
    output: "cropcode-linux-x64.tar.gz",
    runtimes: [{ archivePlatform: "linux-x64", destination: "runtime/node" }],
  },
};

const requested = process.argv.slice(2);
const selected = requested.length > 0 ? requested : Object.keys(targets);
for (const name of selected) {
  if (!targets[name]) {
    throw new Error(`Unknown target '${name}'. Available targets: ${Object.keys(targets).join(", ")}`);
  }
}
if (!existsSync(path.join(root, "dist-portable", "cli.js"))) {
  throw new Error("dist-portable/cli.js is missing. Run npm run bundle:portable first.");
}

await mkdir(releaseDir, { recursive: true });
await rm(workDir, { recursive: true, force: true });
await mkdir(workDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });

const checksums = await loadNodeChecksums();
const outputs = [];

for (const targetName of selected) {
  const target = targets[targetName];
  const folderName = `cropcode-v${version}-${targetName}`;
  const stage = path.join(workDir, folderName);
  await createApplication(stage, targetName, target.windows);

  for (const runtime of target.runtimes) {
    await installNodeRuntime(stage, runtime, checksums);
  }

  const outputPath = path.join(releaseDir, target.output);
  await rm(outputPath, { force: true });
  if (target.windows) {
    run("zip", ["-q", "-r", outputPath, folderName], workDir);
  } else {
    run("tar", ["-czf", outputPath, folderName], workDir);
  }
  outputs.push(outputPath);
  console.log(`Created ${path.relative(root, outputPath)}`);
}

const checksumLines = [];
for (const output of outputs) {
  checksumLines.push(`${await sha256(output)}  ${path.basename(output)}`);
}
await writeFile(path.join(releaseDir, "SHA256SUMS"), `${checksumLines.join("\n")}\n`);
await rm(workDir, { recursive: true, force: true });
console.log("Created release/SHA256SUMS");

async function createApplication(stage, targetName, windows) {
  await mkdir(path.join(stage, "dist"), { recursive: true });
  await copyFile(path.join(root, "dist-portable", "cli.js"), path.join(stage, "dist", "cli.js"));
  await cp(path.join(root, "templates"), path.join(stage, "templates"), { recursive: true });
  await copyFile(path.join(root, "LICENSE"), path.join(stage, "LICENSE"));
  await copyFile(path.join(root, "README.md"), path.join(stage, "README.md"));
  await writeFile(
    path.join(stage, "package.json"),
    `${JSON.stringify({ name: packageJson.name, version, type: "module", license: packageJson.license }, null, 2)}\n`
  );
  await writeFile(path.join(stage, "INSTALL.txt"), installNotes(targetName));

  if (windows) {
    await writeFile(
      path.join(stage, "cropcode.cmd"),
      '@echo off\r\nset "CROPCODE_HOME=%~dp0"\r\nset "PATH=%~dp0runtime;%PATH%"\r\n"%~dp0runtime\\node.exe" "%~dp0dist\\cli.js" %*\r\n'
    );
    await writeFile(
      path.join(stage, "install.cmd"),
      '@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"\r\nif errorlevel 1 pause\r\n'
    );
    await writeFile(path.join(stage, "install.ps1"), windowsInstaller());
  } else {
    const launcher = targetName === "macos-universal" ? macLauncher() : unixLauncher();
    await writeFile(path.join(stage, "cropcode"), launcher, { mode: 0o755 });
    await writeFile(path.join(stage, "install.sh"), unixInstaller(), { mode: 0o755 });
    await chmod(path.join(stage, "cropcode"), 0o755);
    await chmod(path.join(stage, "install.sh"), 0o755);
  }
}

async function installNodeRuntime(stage, runtime, checksums) {
  const isWindows = runtime.archivePlatform.startsWith("win-");
  const archiveName = isWindows
    ? `node-v${nodeVersion}-${runtime.archivePlatform}.zip`
    : `node-v${nodeVersion}-${runtime.archivePlatform}.tar.gz`;
  const archive = path.join(cacheDir, archiveName);
  const expectedHash = checksums.get(archiveName);
  if (!expectedHash) {
    throw new Error(`No official checksum found for ${archiveName}`);
  }
  if (!existsSync(archive) || (await sha256(archive)) !== expectedHash) {
    await rm(archive, { force: true });
    await download(`https://nodejs.org/dist/v${nodeVersion}/${archiveName}`, archive);
  }
  const actualHash = await sha256(archive);
  if (actualHash !== expectedHash) {
    throw new Error(`Checksum mismatch for ${archiveName}: expected ${expectedHash}, got ${actualHash}`);
  }

  const destination = path.join(stage, runtime.destination);
  await mkdir(path.dirname(destination), { recursive: true });
  const archiveRoot = `node-v${nodeVersion}-${runtime.archivePlatform}`;
  const member = isWindows ? `${archiveRoot}/node.exe` : `${archiveRoot}/bin/node`;
  const file = await import("node:fs").then((module) => module.openSync(destination, "w", 0o755));
  try {
    if (isWindows) {
      run("unzip", ["-p", archive, member], root, ["ignore", file, "inherit"]);
    } else {
      run("tar", ["-xOzf", archive, member], root, ["ignore", file, "inherit"]);
    }
  } finally {
    await import("node:fs").then((module) => module.closeSync(file));
  }
  if (!isWindows) {
    await chmod(destination, 0o755);
  }
}

async function loadNodeChecksums() {
  const file = path.join(cacheDir, `SHASUMS256-v${nodeVersion}.txt`);
  if (!existsSync(file)) {
    await download(`https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt`, file);
  }
  const content = await readFile(file, "utf8");
  return new Map(
    content
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/, 2))
      .map(([hash, name]) => [name, hash])
  );
}

async function download(url, destination) {
  console.log(`Downloading ${url}`);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  await pipeline(response.body, createWriteStream(destination));
}

async function sha256(file) {
  const hash = createHash("sha256");
  const stream = (await import("node:fs")).createReadStream(file);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

function run(command, args, cwd, stdio = "inherit") {
  const result = spawnSync(command, args, { cwd, stdio });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with code ${result.status}`);
}

function unixLauncher() {
  return `#!/bin/sh
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PATH="$ROOT/runtime:$PATH"
export PATH CROPCODE_DISTRIBUTION=portable
exec "$ROOT/runtime/node" "$ROOT/dist/cli.js" "$@"
`;
}

function macLauncher() {
  return `#!/bin/sh
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
case "$(uname -m)" in
  arm64) RUNTIME="$ROOT/runtime/arm64" ;;
  x86_64) RUNTIME="$ROOT/runtime/x64" ;;
  *) echo "Unsupported macOS architecture: $(uname -m)" >&2; exit 1 ;;
esac
PATH="$RUNTIME:$PATH"
export PATH CROPCODE_DISTRIBUTION=portable
exec "$RUNTIME/node" "$ROOT/dist/cli.js" "$@"
`;
}

function unixInstaller() {
  return `#!/bin/sh
set -eu
SOURCE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INSTALL_ROOT="\${CROPCODE_INSTALL_DIR:-$HOME/.local/share/cropcode}"
BIN_DIR="\${CROPCODE_BIN_DIR:-$HOME/.local/bin}"
if [ "$SOURCE" = "$INSTALL_ROOT" ]; then
  echo "CropCode is already installed at $INSTALL_ROOT"
  exit 0
fi
rm -rf "$INSTALL_ROOT"
mkdir -p "$INSTALL_ROOT" "$BIN_DIR"
cp -R "$SOURCE"/. "$INSTALL_ROOT"/
cat > "$BIN_DIR/cropcode" <<EOF
#!/bin/sh
exec "$INSTALL_ROOT/cropcode" "\\$@"
EOF
chmod 755 "$BIN_DIR/cropcode"
echo "Installed CropCode to $INSTALL_ROOT"
echo "Launcher: $BIN_DIR/cropcode"
case ":$PATH:" in *":$BIN_DIR:"*) ;; *) echo "Add $BIN_DIR to PATH to run 'cropcode' globally." ;; esac
`;
}

function windowsInstaller() {
  return `$ErrorActionPreference = "Stop"
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$installRoot = if ($env:CROPCODE_INSTALL_DIR) { $env:CROPCODE_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\\CropCode" }
if ((Resolve-Path $source).Path -eq $installRoot) {
  Write-Host "CropCode is already installed at $installRoot"
  exit 0
}
if (Test-Path $installRoot) { Remove-Item -Recurse -Force $installRoot }
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
Copy-Item -Recurse -Force (Join-Path $source "*") $installRoot
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$entries = @($userPath -split ";" | Where-Object { $_ })
if ($entries -notcontains $installRoot) {
  [Environment]::SetEnvironmentVariable("Path", (($entries + $installRoot) -join ";"), "User")
}
$env:Path = "$installRoot;$env:Path"
Write-Host "Installed CropCode to $installRoot"
Write-Host "Open a new terminal and run: cropcode"
`;
}

function installNotes(targetName) {
  if (targetName === "windows-x64") {
    return `CropCode ${version} for Windows x64\n\nInstall: double-click install.cmd, or run .\\cropcode.cmd directly.\n`;
  }
  return `CropCode ${version} for ${targetName}\n\nInstall: run ./install.sh, or run ./cropcode directly.\n`;
}
