import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile, chmod, realpath, rm } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { createRequire } from "node:module";
import { stageThirdPartyNotices, stageNodeNotices } from "../../scripts/third-party-notices.mjs";
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "../..");
const dist = resolve(import.meta.dirname, "dist");
const runtime = join(dist, "runtime");
await mkdir(runtime, { recursive: true });
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const shared = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  minify: true,
  banner: {
    js: 'var __import_meta_url = require("url").pathToFileURL(__filename).href; var __import_meta_dirname = __dirname;',
  },
  define: {
    "import.meta.url": "__import_meta_url",
    "import.meta.dirname": "__import_meta_dirname",
    __ZCODE_VERSION__: JSON.stringify(version),
    __ZCODE_ENV__: '"production"',
  },
};
await build({
  ...shared,
  entryPoints: ["src/extension.ts"],
  outfile: join(dist, "extension.cjs"),
  external: ["vscode"],
});
await build({
  ...shared,
  entryPoints: ["src/host.ts"],
  outfile: join(runtime, "host.cjs"),
  external: ["node-pty", "ssh2", "*.node"],
});
await cp(process.execPath, join(runtime, process.platform === "win32" ? "node.exe" : "node"));
await chmod(join(runtime, process.platform === "win32" ? "node.exe" : "node"), 0o755);
const cli = join(root, "apps/zcode-cli/packages/cli/dist");
await cp(join(cli, "zcode.cjs"), join(runtime, "agent.cjs"));
await cp(join(root, "config/provider/zcode-builtin.json"), join(runtime, "provider.json"));
// Native modules stay outside the host bundle. Copy their transitive runtime dependencies.
const copied = new Set();
async function copyPackage(name, from = root) {
  let source;
  try {
    source = dirname(require.resolve(`${name}/package.json`, { paths: [from] }));
  } catch {
    let cursor = from;
    while (true) {
      try {
        source = await realpath(join(cursor, "node_modules", name));
        break;
      } catch {}
      const parent = dirname(cursor);
      if (parent === cursor) throw new Error(`Cannot locate ${name}`);
      cursor = parent;
    }
  }
  if (copied.has(name)) return;
  copied.add(name);
  const pkg = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
  await cp(source, join(runtime, "node_modules", name), {
    recursive: true,
    dereference: true,
    filter: (path) =>
      path === source ||
      !path
        .slice(source.length + 1)
        .split(/[\\/]/)
        .includes("node_modules"),
  });
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    if (name === "@zcode/tui" && dep.startsWith("@zcode/")) continue;
    await copyPackage(dep, source);
  }
  for (const dep of Object.keys(pkg.optionalDependencies ?? {})) {
    if (dep.includes(process.platform) && dep.includes(process.arch))
      await copyPackage(dep, source);
  }
}
await copyPackage("node-pty");
await copyPackage("ssh2");
await copyPackage("@zcode/tui", join(root, "apps/zcode-cli/packages/cli"));
// Use the Node prebuild, not the Electron development rebuild.
const nativeRoot = dirname(
  dirname(require.resolve(`@lydell/node-pty-${process.platform}-${process.arch}`)),
);
await cp(join(nativeRoot, "prebuilds"), join(runtime, "node_modules/node-pty/prebuilds"), {
  recursive: true,
});
await rm(join(runtime, "node_modules/node-pty/build"), { recursive: true, force: true });
await stageThirdPartyNotices(dist);
await stageNodeNotices(runtime, process.version.replace(/^v/, ""));
await cp(join(root, "LICENSE"), join(import.meta.dirname, "LICENSE"));
await writeFile(
  join(import.meta.dirname, "README.md"),
  "# CropCode\n\n在受信任的项目中运行命令 **CropCode: 打开科研工作台**。模型在设置中配置，终端、桌面和 VSCode 共用本机会话内核。\n",
);
console.log(`CropCode ${version} extension runtime built for ${process.platform}-${process.arch}`);
