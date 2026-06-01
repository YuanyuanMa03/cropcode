import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const originalHome = process.env.HOME;
const originalUserProfile = process.env.USERPROFILE;
let tempHome: string;
let tempCwd: string;

function setHomeDir(dir: string): void {
  process.env.HOME = dir;
  if (process.platform === "win32") {
    process.env.USERPROFILE = dir;
  }
}

beforeEach(() => {
  tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "cropcode-test-home-"));
  tempCwd = fs.mkdtempSync(path.join(os.tmpdir(), "cropcode-test-cwd-"));
  setHomeDir(tempHome);
});

afterEach(() => {
  if (originalHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }
  if (originalUserProfile === undefined) {
    delete process.env.USERPROFILE;
  } else {
    process.env.USERPROFILE = originalUserProfile;
  }
  fs.rmSync(tempHome, { recursive: true, force: true });
  fs.rmSync(tempCwd, { recursive: true, force: true });
});

// --- parseMarketplaceManifest ---

test("parseMarketplaceManifest reads from .claude-plugin/marketplace.json", async () => {
  const { parseMarketplaceManifest } = await import("../marketplace/marketplace-repo");
  const dir = path.join(tempCwd, "market");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ name: "test-market", plugins: [{ name: "p1", description: "d1", source: "./p1" }] })
  );

  const manifest = parseMarketplaceManifest(dir);
  assert.equal(manifest?.name, "test-market");
  assert.equal(manifest?.plugins.length, 1);
  assert.equal(manifest?.plugins[0].name, "p1");
});

test("parseMarketplaceManifest reads from marketplace.json fallback", async () => {
  const { parseMarketplaceManifest } = await import("../marketplace/marketplace-repo");
  const dir = path.join(tempCwd, "market2");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "marketplace.json"), JSON.stringify({ name: "root-market", plugins: [] }));

  const manifest = parseMarketplaceManifest(dir);
  assert.equal(manifest?.name, "root-market");
});

test("parseMarketplaceManifest returns null when no manifest found", async () => {
  const { parseMarketplaceManifest } = await import("../marketplace/marketplace-repo");
  const dir = path.join(tempCwd, "empty");
  fs.mkdirSync(dir, { recursive: true });

  const manifest = parseMarketplaceManifest(dir);
  assert.equal(manifest, null);
});

test("parseMarketplaceManifest returns null for malformed JSON", async () => {
  const { parseMarketplaceManifest } = await import("../marketplace/marketplace-repo");
  const dir = path.join(tempCwd, "bad");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "marketplace.json"), "not json{{{");

  const manifest = parseMarketplaceManifest(dir);
  assert.equal(manifest, null);
});

// --- installPluginToCache: path traversal prevention ---

test("installPluginToCache rejects path traversal in string source", async () => {
  const { installPluginToCache } = await import("../marketplace/marketplace-repo");
  const marketplaceDir = path.join(tempCwd, "market");
  fs.mkdirSync(marketplaceDir, { recursive: true });

  const sensitiveDir = path.join(tempCwd, "sensitive");
  fs.mkdirSync(sensitiveDir, { recursive: true });
  fs.writeFileSync(path.join(sensitiveDir, "secret.txt"), "secret-data");

  const pluginEntry = {
    name: "evil",
    description: "evil plugin",
    source: "../../sensitive" as unknown as string,
  };

  assert.throws(() => installPluginToCache(pluginEntry, "mymarket", marketplaceDir), /escapes marketplace directory/);
});

test("installPluginToCache rejects absolute path traversal", async () => {
  const { installPluginToCache } = await import("../marketplace/marketplace-repo");
  const marketplaceDir = path.join(tempCwd, "market");
  fs.mkdirSync(marketplaceDir, { recursive: true });

  const pluginEntry = {
    name: "evil2",
    description: "evil plugin",
    source: "/etc" as unknown as string,
  };

  assert.throws(() => installPluginToCache(pluginEntry, "mymarket", marketplaceDir), /escapes marketplace directory/);
});

test("installPluginToCache allows valid relative path", async () => {
  const { installPluginToCache } = await import("../marketplace/marketplace-repo");
  const marketplaceDir = path.join(tempCwd, "market");
  const pluginDir = path.join(marketplaceDir, "plugins", "good-plugin");
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(path.join(pluginDir, "README.md"), "good plugin");

  const pluginEntry = {
    name: "good",
    description: "good plugin",
    source: "./plugins/good-plugin" as unknown as string,
  };

  const cachePath = installPluginToCache(pluginEntry, "mymarket", marketplaceDir);
  assert.ok(fs.existsSync(path.join(cachePath, "README.md")));
});

// --- installPluginToCache: symlink skipping ---

test("installPluginToCache skips symlinks in plugin directory", async () => {
  const { installPluginToCache } = await import("../marketplace/marketplace-repo");
  const marketplaceDir = path.join(tempCwd, "market");
  const pluginDir = path.join(marketplaceDir, "plugins", "symlink-plugin");
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(path.join(pluginDir, "real-file.txt"), "real content");

  const externalDir = path.join(tempCwd, "external");
  fs.mkdirSync(externalDir, { recursive: true });
  fs.writeFileSync(path.join(externalDir, "external-file.txt"), "external content");
  fs.symlinkSync(externalDir, path.join(pluginDir, "evil-link"));

  const pluginEntry = {
    name: "symlink-test",
    description: "plugin with symlinks",
    source: "./plugins/symlink-plugin" as unknown as string,
  };

  const cachePath = installPluginToCache(pluginEntry, "mymarket", marketplaceDir);
  assert.ok(fs.existsSync(path.join(cachePath, "real-file.txt")), "real file should be copied");
  assert.ok(!fs.existsSync(path.join(cachePath, "evil-link")), "symlink should be skipped");
});

// --- linkPluginSkills / unlinkPluginSkills ---

test("linkPluginSkills creates symlinks and unlinkPluginSkills removes them", async () => {
  const { linkPluginSkills, unlinkPluginSkills } = await import("../marketplace/marketplace-repo");
  const pluginDir = path.join(tempCwd, "installed-plugin");
  const skillsDir = path.join(pluginDir, "skills", "my-skill");
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(path.join(skillsDir, "SKILL.md"), "# My Skill");

  const linked = linkPluginSkills(pluginDir);
  assert.deepEqual(linked, ["my-skill"]);

  const skillsTarget = path.join(tempHome, ".agents", "skills", "my-skill");
  assert.ok(fs.existsSync(skillsTarget), "symlink should exist in skills dir");
  assert.ok(fs.lstatSync(skillsTarget).isSymbolicLink(), "should be a symlink");

  const unlinked = unlinkPluginSkills(pluginDir);
  assert.deepEqual(unlinked, ["my-skill"]);
  assert.ok(!fs.existsSync(skillsTarget), "symlink should be removed");
});

test("unlinkPluginSkills does not remove symlinks from other plugins", async () => {
  const { linkPluginSkills, unlinkPluginSkills } = await import("../marketplace/marketplace-repo");

  const pluginA = path.join(tempCwd, "plugin-a");
  const pluginB = path.join(tempCwd, "plugin-b");
  fs.mkdirSync(path.join(pluginA, "skills", "shared-skill"), { recursive: true });
  fs.writeFileSync(path.join(pluginA, "skills", "shared-skill", "SKILL.md"), "# Skill A");
  fs.mkdirSync(path.join(pluginB, "skills", "shared-skill"), { recursive: true });
  fs.writeFileSync(path.join(pluginB, "skills", "shared-skill", "SKILL.md"), "# Skill B");

  linkPluginSkills(pluginA);
  linkPluginSkills(pluginB);

  const unlinked = unlinkPluginSkills(pluginA);
  assert.deepEqual(unlinked, [], "should not unlink B's symlink");

  const skillsTarget = path.join(tempHome, ".agents", "skills", "shared-skill");
  assert.ok(fs.existsSync(skillsTarget), "B's symlink should still exist");

  unlinkPluginSkills(pluginB);
});

// --- addMarketplace / removeMarketplace integration ---

test("addMarketplace and removeMarketplace round-trip", async () => {
  const { addMarketplace, removeMarketplace, listMarketplaces } = await import("../marketplace/marketplace-manager");

  const marketDir = path.join(tempCwd, "local-market");
  fs.mkdirSync(marketDir, { recursive: true });
  fs.writeFileSync(
    path.join(marketDir, "marketplace.json"),
    JSON.stringify({
      name: "local",
      description: "A local test marketplace",
      plugins: [{ name: "test-plugin", description: "A test plugin", source: "." }],
    })
  );

  const manifest = addMarketplace("local", { source: "directory", path: marketDir });
  assert.equal(manifest.name, "local");
  assert.equal(manifest.plugins.length, 1);

  const marketplaces = listMarketplaces();
  assert.equal(marketplaces.length, 1);
  assert.equal(marketplaces[0].name, "local");

  removeMarketplace("local");

  const afterRemove = listMarketplaces();
  assert.equal(afterRemove.length, 0);
});

test("addMarketplace rejects duplicate marketplace name", async () => {
  const { addMarketplace, removeMarketplace } = await import("../marketplace/marketplace-manager");

  const marketDir = path.join(tempCwd, "dup-market");
  fs.mkdirSync(marketDir, { recursive: true });
  fs.writeFileSync(path.join(marketDir, "marketplace.json"), JSON.stringify({ name: "dup", plugins: [] }));

  addMarketplace("dup", { source: "directory", path: marketDir });

  assert.throws(() => addMarketplace("dup", { source: "directory", path: marketDir }), /already exists/);

  removeMarketplace("dup");
});
