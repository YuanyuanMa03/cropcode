import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  type MarketplaceManifest,
  type MarketplacePluginEntry,
  type PluginSource,
  ensureDir,
  getMarketplacesDir,
  getPluginsCacheDir,
} from "./types";

function execGit(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

export function cloneOrPullRepo(url: string, targetDir: string, ref?: string): string {
  ensureDir(path.dirname(targetDir));

  if (fs.existsSync(path.join(targetDir, ".git"))) {
    try {
      execGit(["fetch", "origin"], targetDir);
      if (ref) {
        execGit(["checkout", ref], targetDir);
      } else {
        execGit(["pull", "--ff-only"], targetDir);
      }
    } catch {
      fs.rmSync(targetDir, { recursive: true, force: true });
      cloneRepo(url, targetDir, ref);
    }
  } else {
    cloneRepo(url, targetDir, ref);
  }

  return execGit(["rev-parse", "HEAD"], targetDir);
}

function cloneRepo(url: string, targetDir: string, ref?: string): void {
  const args = ["clone", "--depth", "1"];
  if (ref) {
    args.push("--branch", ref, "--single-branch");
  }
  args.push(url, targetDir);
  execGit(args);
}

export function resolveSourceUrl(source: PluginSource): { url: string; ref?: string } {
  switch (source.source) {
    case "url":
      return { url: source.url, ref: source.ref };
    case "github":
      return { url: `https://github.com/${source.repo}.git`, ref: source.ref };
    case "git-subdir":
      return { url: source.url, ref: source.ref };
    case "directory":
      return { url: source.path };
  }
}

export function fetchMarketplace(name: string, source: PluginSource): { dir: string; sha: string } {
  const { url, ref } = resolveSourceUrl(source);

  if (source.source === "directory") {
    return { dir: url, sha: "local" };
  }

  const targetDir = path.join(getMarketplacesDir(), name);
  const sha = cloneOrPullRepo(url, targetDir, ref);
  return { dir: targetDir, sha };
}

export function parseMarketplaceManifest(marketplaceDir: string): MarketplaceManifest | null {
  const candidates = [
    path.join(marketplaceDir, ".claude-plugin", "marketplace.json"),
    path.join(marketplaceDir, ".agents", "plugins", "marketplace.json"),
    path.join(marketplaceDir, "marketplace.json"),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch {
        continue;
      }
    }
  }
  return null;
}

// Normalize a plugin source that might be a relative path string
// (e.g., "./" or "./plugins/my-plugin") into a PluginSource object.
function normalizePluginSource(rawSource: PluginSource | string, marketplaceDir: string): PluginSource {
  if (typeof rawSource === "string") {
    // Relative path within the marketplace repo
    const resolvedPath = path.resolve(marketplaceDir, rawSource);
    return { source: "directory", path: resolvedPath };
  }
  return rawSource;
}

export function installPluginToCache(
  pluginEntry: MarketplacePluginEntry,
  marketplaceName: string,
  marketplaceDir: string
): string {
  const cacheDir = path.join(getPluginsCacheDir(), marketplaceName, pluginEntry.name);
  ensureDir(path.dirname(cacheDir));

  const source = normalizePluginSource(pluginEntry.source, marketplaceDir);

  if (source.source === "directory") {
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
    copyDirRecursive(source.path, cacheDir);
    return cacheDir;
  }

  const { url, ref } = resolveSourceUrl(source);

  if (source.source === "git-subdir") {
    const tmpDir = path.join(getPluginsCacheDir(), ".tmp", `${marketplaceName}-${pluginEntry.name}`);
    cloneOrPullRepo(url, tmpDir, ref);
    const subDir = path.join(tmpDir, source.path);
    if (!fs.existsSync(subDir)) {
      throw new Error(`Subdirectory not found: ${source.path}`);
    }
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
    copyDirRecursive(subDir, cacheDir);
    return cacheDir;
  }

  cloneOrPullRepo(url, cacheDir, ref);
  return cacheDir;
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function linkPluginSkills(pluginDir: string): string[] {
  const skillsDir = path.join(pluginDir, "skills");
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    return [];
  }

  const linked: string[] = [];
  const targetBase = path.join(os.homedir(), ".agents", "skills");
  ensureDir(targetBase);

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const skillSourceDir = path.join(skillsDir, entry.name);
    const skillFile = path.join(skillSourceDir, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;

    const linkPath = path.join(targetBase, entry.name);
    try {
      if (fs.existsSync(linkPath)) {
        fs.rmSync(linkPath, { recursive: true, force: true });
      }
    } catch {
      continue;
    }

    fs.symlinkSync(skillSourceDir, linkPath);
    linked.push(entry.name);
  }

  return linked;
}

export function unlinkPluginSkills(pluginDir: string): string[] {
  const skillsDir = path.join(pluginDir, "skills");
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    return [];
  }

  const unlinked: string[] = [];
  const targetBase = path.join(os.homedir(), ".agents", "skills");

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const linkPath = path.join(targetBase, entry.name);

    try {
      if (fs.existsSync(linkPath) && fs.lstatSync(linkPath).isSymbolicLink()) {
        const target = fs.readlinkSync(linkPath);
        if (typeof target === "string" && target.includes(pluginDir)) {
          fs.unlinkSync(linkPath);
          unlinked.push(entry.name);
        }
      }
    } catch {
      // ignore
    }
  }

  return unlinked;
}
