import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// --- Marketplace types (compatible with Claude Code format) ---

export type PluginSourceUrl = {
  source: "url";
  url: string;
  ref?: string;
  sha?: string;
};

export type PluginSourceGitSubdir = {
  source: "git-subdir";
  url: string;
  path: string;
  ref?: string;
  sha?: string;
};

export type PluginSourceGithub = {
  source: "github";
  repo: string;
  ref?: string;
};

export type PluginSourceDirectory = {
  source: "directory";
  path: string;
};

export type PluginSource = PluginSourceUrl | PluginSourceGitSubdir | PluginSourceGithub | PluginSourceDirectory;

export type MarketplacePluginEntry = {
  name: string;
  description: string;
  author?: { name: string; email?: string };
  category?: string;
  source: PluginSource | string;
  homepage?: string;
  version?: string;
};

export type MarketplaceManifest = {
  name: string;
  description?: string;
  owner?: { name: string; email?: string };
  plugins: MarketplacePluginEntry[];
};

// --- Config types (stored in ~/.cropcode/settings.json) ---

export type MarketplaceConfig = {
  source: PluginSource;
  lastUpdated?: string;
};

export type InstalledPluginConfig = {
  marketplace: string;
  path?: string;
  version?: string;
  installedAt: string;
};

// --- Helpers ---

export function getCropcodeDir(): string {
  return path.join(os.homedir(), ".cropcode");
}

export function getMarketplacesDir(): string {
  return path.join(getCropcodeDir(), "marketplaces");
}

export function getPluginsCacheDir(): string {
  return path.join(getCropcodeDir(), "plugins", "cache");
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
