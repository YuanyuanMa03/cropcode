import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import * as fs from "node:fs";
import { mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import React from "react";
import { render, type Instance } from "ink";
import chalk from "chalk";
import { UpdatePrompt, type UpdatePromptChoice } from "../ui";

export type PackageInfo = {
  name: string;
  version: string;
};

export type ReleaseTarget = "windows-x64" | "macos-universal" | "linux-x64";

export type ReleaseAsset = {
  file: string;
  sha256: string;
  size: number;
};

export type ReleaseManifest = {
  schemaVersion: 1;
  version: string;
  publishedAt: string;
  releaseNotesUrl: string;
  assets: Partial<Record<ReleaseTarget, ReleaseAsset>>;
};

type UpdateState = {
  pending?: {
    currentVersion: string;
    latestVersion: string;
    checkedAt: string;
    releaseNotesUrl: string;
  } | null;
  ignoredVersions?: string[];
  lastCheckedAt?: string;
};

const REPOSITORY = "YuanyuanMa03/cropcode";
const UPDATE_STATE_FILE = "update-check.json";
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MANIFEST_TIMEOUT_MS = 5_000;
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_MANIFEST_CHARS = 64 * 1024;
const STALE_UPDATE_LOCK_MS = 60 * 60 * 1000;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export async function promptForPendingUpdate(packageInfo: PackageInfo): Promise<{ installed: boolean }> {
  const state = readUpdateState();
  const pending = state.pending;
  if (!pending) {
    return { installed: false };
  }

  if (compareVersions(packageInfo.version, pending.latestVersion) >= 0) {
    writeUpdateState({ ...state, pending: null });
    return { installed: false };
  }

  if (state.ignoredVersions?.includes(pending.latestVersion)) {
    writeUpdateState({ ...state, pending: null });
    return { installed: false };
  }

  const choice = await promptUpdateChoice({
    currentVersion: packageInfo.version,
    latestVersion: pending.latestVersion,
    installCommand: "cropcode update",
  });

  if (choice === "install") {
    const installed = await installLatestRelease(packageInfo);
    if (installed) {
      writeUpdateState({ ...state, pending: null });
      process.stdout.write(
        `\n${chalk.green("CropCode has been updated. Restart the CLI to use the new version.")}\n\n`
      );
    }
    return { installed };
  }

  if (choice === "ignore-version") {
    const ignoredVersions = Array.from(new Set([...(state.ignoredVersions ?? []), pending.latestVersion]));
    writeUpdateState({ ...state, pending: null, ignoredVersions });
    return { installed: false };
  }

  writeUpdateState({ ...state, pending: null });
  return { installed: false };
}

export async function checkForReleaseUpdate(packageInfo: PackageInfo, force = false): Promise<ReleaseManifest | null> {
  if (!VERSION_PATTERN.test(packageInfo.version)) {
    return null;
  }

  const state = readUpdateState();
  if (!force && !isUpdateCheckDue(state.lastCheckedAt)) {
    return null;
  }

  const checkedAt = new Date().toISOString();
  try {
    const manifest = await fetchReleaseManifest();
    if (compareVersions(manifest.version, packageInfo.version) <= 0) {
      writeUpdateState({ ...state, pending: null, lastCheckedAt: checkedAt });
      return manifest;
    }

    if (state.ignoredVersions?.includes(manifest.version)) {
      writeUpdateState({ ...state, pending: null, lastCheckedAt: checkedAt });
      return manifest;
    }

    writeUpdateState({
      ...state,
      lastCheckedAt: checkedAt,
      pending: {
        currentVersion: packageInfo.version,
        latestVersion: manifest.version,
        checkedAt,
        releaseNotesUrl: manifest.releaseNotesUrl,
      },
    });
    return manifest;
  } catch {
    return null;
  }
}

export async function runUpdateCommand(packageInfo: PackageInfo, args: string[]): Promise<number> {
  if (process.env.CROPCODE_DISTRIBUTION !== "portable") {
    process.stderr.write(
      "This CropCode installation is not a portable release. Update it with the package manager or source checkout that installed it.\n"
    );
    return 1;
  }

  if (args.some((arg) => arg !== "--check")) {
    process.stderr.write("Usage: cropcode update [--check]\n");
    return 1;
  }

  if (args.includes("--check")) {
    const manifest = await checkForReleaseUpdate(packageInfo, true);
    if (!manifest) {
      process.stderr.write("Unable to check for CropCode updates.\n");
      return 1;
    }
    if (compareVersions(manifest.version, packageInfo.version) <= 0) {
      process.stdout.write(`CropCode ${packageInfo.version} is up to date.\n`);
      return 0;
    }
    process.stdout.write(
      `CropCode ${manifest.version} is available (current: ${packageInfo.version}).\n${manifest.releaseNotesUrl}\n`
    );
    return 0;
  }

  return (await installLatestRelease(packageInfo)) ? 0 : 1;
}

export async function runRollbackCommand(): Promise<number> {
  if (process.env.CROPCODE_DISTRIBUTION !== "portable") {
    process.stderr.write("This CropCode installation is not a portable release and cannot be rolled back here.\n");
    return 1;
  }
  let releaseLock: (() => void) | null = null;
  try {
    releaseLock = acquireUpdateLock();
    const { currentVersion, previousVersion } = await rollbackInstalledVersion();
    process.stdout.write(
      `CropCode rolled back from ${currentVersion} to ${previousVersion}. Restart the CLI to use it.\n`
    );
    return 0;
  } catch (error) {
    process.stderr.write(`Unable to roll back CropCode: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  } finally {
    releaseLock?.();
  }
}

export async function installLatestRelease(packageInfo: PackageInfo): Promise<boolean> {
  let tempDir: string | null = null;
  let releaseLock: (() => void) | null = null;
  try {
    const manifest = await fetchReleaseManifest();
    if (compareVersions(manifest.version, packageInfo.version) <= 0) {
      process.stdout.write(`CropCode ${packageInfo.version} is already the latest version.\n`);
      return true;
    }

    releaseLock = acquireUpdateLock();

    const target = resolveReleaseTarget();
    const asset = manifest.assets[target];
    if (!asset) {
      throw new Error(`Release ${manifest.version} does not include an asset for ${target}.`);
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), "cropcode-update-"));
    const archivePath = path.join(tempDir, asset.file);
    process.stdout.write(`Downloading CropCode ${manifest.version} for ${target}...\n`);
    await downloadFile(getReleaseAssetUrl(manifest, asset), archivePath);

    const actualSize = fs.statSync(archivePath).size;
    if (actualSize !== asset.size) {
      throw new Error(`Downloaded size mismatch: expected ${asset.size}, received ${actualSize}.`);
    }
    const actualHash = await sha256(archivePath);
    if (actualHash !== asset.sha256) {
      throw new Error(`Downloaded checksum mismatch for ${asset.file}.`);
    }

    const extractDir = path.join(tempDir, "extract");
    await mkdir(extractDir);
    await extractArchive(archivePath, extractDir);
    const installer = await findPackageInstaller(extractDir);
    await runPackageInstaller(installer);
    const installedVersion = readVersionPointer(path.join(getInstallRoot(), "current-version"), "installed");
    if (installedVersion !== manifest.version) {
      throw new Error(
        `Installer activated ${installedVersion}, but the release manifest requires ${manifest.version}.`
      );
    }
    process.stdout.write(`Installed CropCode ${manifest.version}. Restart CropCode to use the update.\n`);
    return true;
  } catch (error) {
    process.stderr.write(`CropCode update failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return false;
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
    releaseLock?.();
  }
}

export async function rollbackInstalledVersion(
  installRoot = getInstallRoot()
): Promise<{ currentVersion: string; previousVersion: string }> {
  const currentPath = path.join(installRoot, "current-version");
  const previousPath = path.join(installRoot, "previous-version");
  const currentVersion = readVersionPointer(currentPath, "current");
  const previousVersion = readVersionPointer(previousPath, "previous");
  const launcher = path.join(
    installRoot,
    "versions",
    previousVersion,
    process.platform === "win32" ? "cropcode.cmd" : "cropcode"
  );
  if (!existsSync(launcher)) {
    throw new Error(`previous version ${previousVersion} is not installed`);
  }

  await writeVersionPointer(previousPath, currentVersion);
  await writeVersionPointer(currentPath, previousVersion);
  return { currentVersion, previousVersion };
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return 1;
    if (left[index] < right[index]) return -1;
  }
  return 0;
}

export function parseReleaseManifest(value: unknown): ReleaseManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !VERSION_PATTERN.test(String(value.version))) {
    throw new Error("Invalid CropCode release manifest header.");
  }
  if (typeof value.publishedAt !== "string" || typeof value.releaseNotesUrl !== "string") {
    throw new Error("Invalid CropCode release manifest metadata.");
  }
  if (!isRecord(value.assets)) {
    throw new Error("Invalid CropCode release manifest assets.");
  }

  const assets: ReleaseManifest["assets"] = {};
  for (const target of ["windows-x64", "macos-universal", "linux-x64"] as const) {
    const asset = value.assets[target];
    if (asset === undefined) continue;
    if (
      !isRecord(asset) ||
      typeof asset.file !== "string" ||
      path.basename(asset.file) !== asset.file ||
      typeof asset.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      typeof asset.size !== "number" ||
      !Number.isSafeInteger(asset.size) ||
      asset.size <= 0
    ) {
      throw new Error(`Invalid CropCode release asset for ${target}.`);
    }
    assets[target] = { file: asset.file, sha256: asset.sha256, size: asset.size };
  }
  if (Object.keys(assets).length === 0) {
    throw new Error("CropCode release manifest has no supported assets.");
  }

  return {
    schemaVersion: 1,
    version: String(value.version),
    publishedAt: value.publishedAt,
    releaseNotesUrl: value.releaseNotesUrl,
    assets,
  };
}

export function resolveReleaseTarget(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): ReleaseTarget {
  if (platform === "darwin" && (arch === "arm64" || arch === "x64")) return "macos-universal";
  if (platform === "linux" && arch === "x64") return "linux-x64";
  if (platform === "win32" && arch === "x64") return "windows-x64";
  throw new Error(`CropCode does not provide a release for ${platform}-${arch}.`);
}

export function getManifestUrl(env: NodeJS.ProcessEnv = process.env): string {
  const customBase = env.CROPCODE_DOWNLOAD_BASE?.replace(/\/+$/, "");
  return customBase
    ? `${customBase}/manifest.json`
    : `https://github.com/${REPOSITORY}/releases/latest/download/manifest.json`;
}

export function getReleaseAssetUrl(
  manifest: ReleaseManifest,
  asset: ReleaseAsset,
  env: NodeJS.ProcessEnv = process.env
): string {
  const customBase = env.CROPCODE_DOWNLOAD_BASE?.replace(/\/+$/, "");
  const base = customBase ?? `https://github.com/${REPOSITORY}/releases/download/v${manifest.version}`;
  return `${base}/${asset.file}`;
}

export function getUpdateStatePath(): string {
  return path.join(os.homedir(), ".cropcode", UPDATE_STATE_FILE);
}

async function fetchReleaseManifest(): Promise<ReleaseManifest> {
  const response = await fetch(getManifestUrl(), {
    redirect: "follow",
    signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
    headers: { Accept: "application/json", "User-Agent": "cropcode-update-check" },
  });
  if (!response.ok) {
    throw new Error(`Release manifest request failed with HTTP ${response.status}.`);
  }
  const text = await response.text();
  if (text.length > MAX_MANIFEST_CHARS) {
    throw new Error("Release manifest is too large.");
  }
  return parseReleaseManifest(JSON.parse(text) as unknown);
}

async function downloadFile(url: string, destination: string): Promise<void> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    headers: { "User-Agent": "cropcode-updater" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Release download failed with HTTP ${response.status}.`);
  }
  await pipeline(response.body, createWriteStream(destination));
}

async function extractArchive(archivePath: string, destination: string): Promise<void> {
  if (process.platform === "win32") {
    await runProcess("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      archivePath,
      destination,
    ]);
    return;
  }
  await runProcess("tar", ["-xzf", archivePath, "-C", destination]);
}

async function findPackageInstaller(extractDir: string): Promise<string> {
  const entries = await readdir(extractDir, { withFileTypes: true });
  const installerName = process.platform === "win32" ? "install.ps1" : "install.sh";
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("cropcode-v")) continue;
    const candidate = path.join(extractDir, entry.name, installerName);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Downloaded package does not contain ${installerName}.`);
}

async function runPackageInstaller(installer: string): Promise<void> {
  if (process.platform === "win32") {
    await runProcess("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installer], true);
    return;
  }
  await runProcess("sh", [installer], true);
}

function runProcess(command: string, args: string[], inheritStdio = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: inheritStdio ? "inherit" : "ignore", shell: false });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function sha256(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function getInstallRoot(): string {
  if (process.env.CROPCODE_INSTALL_DIR) return process.env.CROPCODE_INSTALL_DIR;
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) throw new Error("LOCALAPPDATA is not set");
    return path.join(localAppData, "Programs", "CropCode");
  }
  return path.join(os.homedir(), ".local", "share", "cropcode");
}

function acquireUpdateLock(installRoot = getInstallRoot()): () => void {
  fs.mkdirSync(installRoot, { recursive: true });
  const lockPath = path.join(installRoot, "update.lock");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = fs.openSync(lockPath, "wx", 0o600);
      try {
        fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`);
      } finally {
        fs.closeSync(descriptor);
      }
      return () => {
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // The lock may already have been cleaned up by the operating system or administrator.
        }
      };
    } catch (error) {
      if (!isFileExistsError(error)) throw error;
      const age = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (attempt === 0 && age >= STALE_UPDATE_LOCK_MS) {
        fs.unlinkSync(lockPath);
        continue;
      }
      throw new Error("another CropCode update is already running");
    }
  }
  throw new Error("unable to acquire the CropCode update lock");
}

function readVersionPointer(file: string, label: string): string {
  if (!existsSync(file)) throw new Error(`${label} version is not recorded`);
  const version = fs.readFileSync(file, "utf8").trim();
  if (!VERSION_PATTERN.test(version)) throw new Error(`${label} version is invalid`);
  return version;
}

async function writeVersionPointer(file: string, version: string): Promise<void> {
  const temp = `${file}.tmp-${process.pid}`;
  await writeFile(temp, `${version}\n`, "utf8");
  await rename(temp, file);
}

function isUpdateCheckDue(lastCheckedAt: string | undefined): boolean {
  if (!lastCheckedAt) return true;
  const timestamp = Date.parse(lastCheckedAt);
  return !Number.isFinite(timestamp) || Date.now() - timestamp >= UPDATE_INTERVAL_MS;
}

async function promptUpdateChoice({
  currentVersion,
  latestVersion,
  installCommand,
}: {
  currentVersion: string;
  latestVersion: string;
  installCommand: string;
}): Promise<"install" | "ignore-once" | "ignore-version"> {
  return new Promise<UpdatePromptChoice>((resolve) => {
    let selected = false;
    let instance: Instance | null = null;
    const handleSelect = (choice: UpdatePromptChoice): void => {
      if (selected) return;
      selected = true;
      resolve(choice);
      instance?.unmount();
    };
    instance = render(
      React.createElement(UpdatePrompt, { currentVersion, latestVersion, installCommand, onSelect: handleSelect }),
      { exitOnCtrlC: false }
    );
  });
}

function readUpdateState(): UpdateState {
  const statePath = getUpdateStatePath();
  if (!existsSync(statePath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, "utf8")) as UpdateState;
    const pending = isRecord(parsed.pending) ? parsed.pending : null;
    const normalizedPending =
      pending &&
      typeof pending.currentVersion === "string" &&
      VERSION_PATTERN.test(pending.currentVersion) &&
      typeof pending.latestVersion === "string" &&
      VERSION_PATTERN.test(pending.latestVersion) &&
      typeof pending.checkedAt === "string" &&
      typeof pending.releaseNotesUrl === "string"
        ? {
            currentVersion: pending.currentVersion,
            latestVersion: pending.latestVersion,
            checkedAt: pending.checkedAt,
            releaseNotesUrl: pending.releaseNotesUrl,
          }
        : null;
    return {
      pending: normalizedPending,
      ignoredVersions: Array.isArray(parsed.ignoredVersions)
        ? parsed.ignoredVersions.filter(
            (value): value is string => typeof value === "string" && VERSION_PATTERN.test(value)
          )
        : [],
      lastCheckedAt: typeof parsed.lastCheckedAt === "string" ? parsed.lastCheckedAt : undefined,
    };
  } catch {
    return {};
  }
}

function writeUpdateState(state: UpdateState): void {
  const statePath = getUpdateStatePath();
  const tempPath = `${statePath}.tmp-${process.pid}`;
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    fs.renameSync(tempPath, statePath);
  } catch {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // Update state is best-effort and must never interrupt normal CLI operation.
    }
  }
}

function parseVersion(value: string): [number, number, number] {
  if (!VERSION_PATTERN.test(value)) throw new Error(`Invalid CropCode version: ${value}`);
  const parts = value.split(".").map((part) => Number.parseInt(part, 10));
  return [parts[0], parts[1], parts[2]];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileExistsError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}
