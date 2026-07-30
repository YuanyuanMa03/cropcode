import { createHash } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { chmod, copyFile, cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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
  outputs.push({ targetName, outputPath });
  console.log(`Created ${path.relative(root, outputPath)}`);
}

const checksumLines = [];
const manifestAssets = {};
for (const { targetName, outputPath } of outputs) {
  const hash = await sha256(outputPath);
  checksumLines.push(`${hash}  ${path.basename(outputPath)}`);
  manifestAssets[targetName] = {
    file: path.basename(outputPath),
    sha256: hash,
    size: (await stat(outputPath)).size,
  };
}
await writeFile(path.join(releaseDir, "SHA256SUMS"), `${checksumLines.join("\n")}\n`);
await writeFile(
  path.join(releaseDir, "manifest.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      version,
      publishedAt: new Date().toISOString(),
      releaseNotesUrl: `https://github.com/YuanyuanMa03/cropcode/releases/tag/v${version}`,
      assets: manifestAssets,
    },
    null,
    2
  )}\n`
);
await rm(workDir, { recursive: true, force: true });
console.log("Created release/SHA256SUMS and release/manifest.json");

async function createApplication(stage, targetName, windows) {
  await mkdir(path.join(stage, "dist"), { recursive: true });
  await copyFile(path.join(root, "dist-portable", "cli.js"), path.join(stage, "dist", "cli.js"));
  // Templates moved to packages/core/templates/ during the monorepo split.
  await cp(path.join(root, "packages", "core", "templates"), path.join(stage, "templates"), { recursive: true });
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
VERSION="${version}"
TARGET_ROOT="$INSTALL_ROOT/versions/$VERSION"
STAGING="$INSTALL_ROOT/.staging-$VERSION-$$"

cleanup() {
  rm -rf "$STAGING"
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$INSTALL_ROOT/versions" "$BIN_DIR"
if [ ! -d "$TARGET_ROOT" ]; then
  mkdir -p "$STAGING"
  cp -R "$SOURCE"/. "$STAGING"/
  INSTALLED_VERSION=$("$STAGING/cropcode" --version)
  if [ "$INSTALLED_VERSION" != "$VERSION" ]; then
    echo "Package version mismatch: expected $VERSION, got $INSTALLED_VERSION" >&2
    exit 1
  fi
  mv "$STAGING" "$TARGET_ROOT"
else
  INSTALLED_VERSION=$("$TARGET_ROOT/cropcode" --version)
  if [ "$INSTALLED_VERSION" != "$VERSION" ]; then
    echo "Existing installation at $TARGET_ROOT is invalid." >&2
    exit 1
  fi
fi

if [ -f "$INSTALL_ROOT/current-version" ]; then
  CURRENT_VERSION=$(sed -n '1p' "$INSTALL_ROOT/current-version")
  if [ -n "$CURRENT_VERSION" ] && [ "$CURRENT_VERSION" != "$VERSION" ]; then
    printf '%s\\n' "$CURRENT_VERSION" > "$INSTALL_ROOT/previous-version.tmp"
    mv "$INSTALL_ROOT/previous-version.tmp" "$INSTALL_ROOT/previous-version"
  fi
fi
printf '%s\\n' "$VERSION" > "$INSTALL_ROOT/current-version.tmp"
mv "$INSTALL_ROOT/current-version.tmp" "$INSTALL_ROOT/current-version"
printf '%s\\n' "$INSTALL_ROOT" > "$BIN_DIR/cropcode-root.tmp"
mv "$BIN_DIR/cropcode-root.tmp" "$BIN_DIR/cropcode-root"

cat > "$BIN_DIR/cropcode" <<'EOF'
#!/bin/sh
BIN_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INSTALL_ROOT=$(sed -n '1p' "$BIN_ROOT/cropcode-root")
VERSION=$(sed -n '1p' "$INSTALL_ROOT/current-version")
case "$VERSION" in
  ""|*[!0-9.]*) echo "CropCode current-version is invalid." >&2; exit 1 ;;
esac
APP="$INSTALL_ROOT/versions/$VERSION/cropcode"
if [ ! -x "$APP" ]; then
  echo "CropCode version $VERSION is not installed correctly." >&2
  exit 1
fi
export CROPCODE_INSTALL_DIR="$INSTALL_ROOT"
exec "$APP" "$@"
EOF
chmod 755 "$BIN_DIR/cropcode"
echo "Installed CropCode $VERSION to $TARGET_ROOT"
echo "Launcher: $BIN_DIR/cropcode"
case ":$PATH:" in *":$BIN_DIR:"*) ;; *) echo "Add $BIN_DIR to PATH to run 'cropcode' globally." ;; esac
`;
}

function windowsInstaller() {
  return `$ErrorActionPreference = "Stop"
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$installRoot = if ($env:CROPCODE_INSTALL_DIR) { $env:CROPCODE_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\\CropCode" }
$version = "${version}"
$versionsRoot = Join-Path $installRoot "versions"
$targetRoot = Join-Path $versionsRoot $version
$staging = Join-Path $installRoot (".staging-" + $version + "-" + [guid]::NewGuid().ToString("N"))

New-Item -ItemType Directory -Force -Path $versionsRoot | Out-Null
try {
  if (-not (Test-Path $targetRoot)) {
    New-Item -ItemType Directory -Force -Path $staging | Out-Null
    Copy-Item -Recurse -Force (Join-Path $source "*") $staging
    $installedVersion = (& (Join-Path $staging "cropcode.cmd") --version | Select-Object -First 1).Trim()
    if ($installedVersion -ne $version) {
      throw "Package version mismatch: expected $version, got $installedVersion"
    }
    Move-Item -Path $staging -Destination $targetRoot
  } else {
    $installedVersion = (& (Join-Path $targetRoot "cropcode.cmd") --version | Select-Object -First 1).Trim()
    if ($installedVersion -ne $version) {
      throw "Existing installation at $targetRoot is invalid."
    }
  }
} finally {
  if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
}

$currentVersionFile = Join-Path $installRoot "current-version"
$previousVersionFile = Join-Path $installRoot "previous-version"
if (Test-Path $currentVersionFile) {
  $currentVersion = (Get-Content $currentVersionFile -TotalCount 1).Trim()
  if ($currentVersion -and $currentVersion -ne $version) {
    Set-Content -NoNewline -Path ($previousVersionFile + ".tmp") -Value ($currentVersion + [Environment]::NewLine)
    Move-Item -Force ($previousVersionFile + ".tmp") $previousVersionFile
  }
}
Set-Content -NoNewline -Path ($currentVersionFile + ".tmp") -Value ($version + [Environment]::NewLine)
Move-Item -Force ($currentVersionFile + ".tmp") $currentVersionFile

$rootLauncher = @'
@echo off
setlocal
set "CROPCODE_INSTALL_DIR=%~dp0"
set /p CROPCODE_VERSION=<"%~dp0current-version"
if not exist "%~dp0versions\\%CROPCODE_VERSION%\\cropcode.cmd" (
  echo CropCode version %CROPCODE_VERSION% is not installed correctly. 1>&2
  exit /b 1
)
call "%~dp0versions\\%CROPCODE_VERSION%\\cropcode.cmd" %*
exit /b %errorlevel%
'@
Set-Content -NoNewline -Path (Join-Path $installRoot "cropcode.cmd") -Value $rootLauncher
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$entries = @($userPath -split ";" | Where-Object { $_ })
if ($entries -notcontains $installRoot) {
  [Environment]::SetEnvironmentVariable("Path", (($entries + $installRoot) -join ";"), "User")
}
$env:Path = "$installRoot;$env:Path"
Write-Host "Installed CropCode $version to $targetRoot"
Write-Host "Open a new terminal and run: cropcode"
`;
}

function installNotes(targetName) {
  if (targetName === "windows-x64") {
    return `CropCode ${version} for Windows x64\n\nInstall: double-click install.cmd, or run .\\cropcode.cmd directly.\n`;
  }
  return `CropCode ${version} for ${targetName}\n\nInstall: run ./install.sh, or run ./cropcode directly.\n`;
}
