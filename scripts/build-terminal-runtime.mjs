import { cp, mkdir, readFile, realpath, chmod, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { stageNodeNotices } from "./third-party-notices.mjs";

const root = resolve(import.meta.dirname, "..");
const runtime = join(root, "release", ".terminal-runtime");
const require = createRequire(import.meta.url);
await rm(runtime, { recursive: true, force: true });
await mkdir(runtime, { recursive: true });
const nodeName = process.platform === "win32" ? "node.exe" : "node";
await cp(process.execPath, join(runtime, nodeName));
await chmod(join(runtime, nodeName), 0o755);
await cp(join(root, "apps/zcode-cli/packages/cli/dist/zcode.cjs"), join(runtime, "agent.cjs"));
await cp(join(root, "config/provider/zcode-builtin.json"), join(runtime, "provider.json"));

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
for (const name of ["koffi", "unsafe-pointer", "node-gyp-build"]) await copyPackage(name);
const nativeRoot = dirname(
  dirname(require.resolve(`@lydell/node-pty-${process.platform}-${process.arch}`)),
);
await cp(join(nativeRoot, "prebuilds"), join(runtime, "node_modules/node-pty/prebuilds"), {
  recursive: true,
});
await stageNodeNotices(runtime, process.version.replace(/^v/, ""));
console.log(runtime);
