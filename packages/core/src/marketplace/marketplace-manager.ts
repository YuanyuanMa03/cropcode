import * as fs from "fs";
import * as path from "path";
import {
  type MarketplaceConfig,
  type MarketplaceManifest,
  type PluginSource,
  type InstalledPluginConfig,
  ensureDir,
  getCropcodeDir,
  getMarketplacesDir,
} from "./types";
import {
  fetchMarketplace,
  parseMarketplaceManifest,
  installPluginToCache,
  linkPluginSkills,
  unlinkPluginSkills,
} from "./marketplace-repo";

const SETTINGS_PATH = path.join(getCropcodeDir(), "settings.json");

type CropcodeSettings = {
  marketplaces?: Record<string, MarketplaceConfig>;
  installedPlugins?: Record<string, InstalledPluginConfig>;
  [key: string]: unknown;
};

function readSettings(): CropcodeSettings {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeSettings(settings: CropcodeSettings): void {
  ensureDir(path.dirname(SETTINGS_PATH));
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
}

// --- Marketplace operations ---

export function addMarketplace(name: string, source: PluginSource): MarketplaceManifest {
  const settings = readSettings();
  if (settings.marketplaces?.[name]) {
    throw new Error(`Marketplace "${name}" already exists. Remove it first.`);
  }

  const { dir } = fetchMarketplace(name, source);
  const manifest = parseMarketplaceManifest(dir);
  if (!manifest) {
    throw new Error(`No marketplace.json found in repository.`);
  }

  if (!settings.marketplaces) {
    settings.marketplaces = {};
  }
  settings.marketplaces[name] = {
    source,
    lastUpdated: new Date().toISOString(),
  };
  writeSettings(settings);

  return manifest;
}

export function removeMarketplace(name: string): void {
  const settings = readSettings();
  if (!settings.marketplaces?.[name]) {
    throw new Error(`Marketplace "${name}" not found.`);
  }

  // Uninstall all plugins from this marketplace
  if (settings.installedPlugins) {
    const toRemove = Object.entries(settings.installedPlugins)
      .filter(([, cfg]) => cfg.marketplace === name)
      .map(([pluginName]) => pluginName);
    for (const pluginName of toRemove) {
      removePlugin(pluginName);
    }
  }

  delete settings.marketplaces[name];
  writeSettings(settings);
}

export function listMarketplaces(): Array<{
  name: string;
  config: MarketplaceConfig;
  manifest: MarketplaceManifest | null;
}> {
  const settings = readSettings();
  const result: Array<{ name: string; config: MarketplaceConfig; manifest: MarketplaceManifest | null }> = [];

  for (const [name, config] of Object.entries(settings.marketplaces ?? {})) {
    let manifest: MarketplaceManifest | null = null;
    try {
      const targetDir =
        config.source.source === "directory" ? config.source.path : path.join(getMarketplacesDir(), name);
      manifest = parseMarketplaceManifest(targetDir);
    } catch {
      // marketplace dir may be unavailable
    }
    result.push({ name, config, manifest });
  }

  return result;
}

export function getMarketplaceManifest(marketplaceName: string): { manifest: MarketplaceManifest; dir: string } {
  const settings = readSettings();
  const config = settings.marketplaces?.[marketplaceName];
  if (!config) {
    throw new Error(`Marketplace "${marketplaceName}" not found.`);
  }
  const { dir } = fetchMarketplace(marketplaceName, config.source);
  const manifest = parseMarketplaceManifest(dir);
  if (!manifest) {
    throw new Error(`No marketplace.json found.`);
  }
  return { manifest, dir };
}

// --- Plugin operations ---

export function installPlugin(pluginName: string, marketplaceName: string): string[] {
  const settings = readSettings();
  if (settings.installedPlugins?.[pluginName]) {
    throw new Error(`Plugin "${pluginName}" is already installed.`);
  }

  const { manifest, dir: marketplaceDir } = getMarketplaceManifest(marketplaceName);
  const pluginEntry = manifest.plugins.find((p) => p.name === pluginName);
  if (!pluginEntry) {
    const available = manifest.plugins.map((p) => p.name).join(", ");
    throw new Error(`Plugin "${pluginName}" not found in marketplace "${marketplaceName}". Available: ${available}`);
  }

  const pluginDir = installPluginToCache(pluginEntry, marketplaceName, marketplaceDir);
  const linkedSkills = linkPluginSkills(pluginDir);

  if (!settings.installedPlugins) {
    settings.installedPlugins = {};
  }
  settings.installedPlugins[pluginName] = {
    marketplace: marketplaceName,
    path: pluginDir,
    installedAt: new Date().toISOString(),
  };
  writeSettings(settings);

  return linkedSkills;
}

export function removePlugin(pluginName: string): void {
  const settings = readSettings();
  const config = settings.installedPlugins?.[pluginName];
  if (!config) {
    throw new Error(`Plugin "${pluginName}" is not installed.`);
  }

  if (config.path) {
    unlinkPluginSkills(config.path);
  }

  delete settings.installedPlugins?.[pluginName];
  writeSettings(settings);
}

export function listInstalledPlugins(): Array<{ name: string; config: InstalledPluginConfig }> {
  const settings = readSettings();
  return Object.entries(settings.installedPlugins ?? {}).map(([name, config]) => ({
    name,
    config,
  }));
}
