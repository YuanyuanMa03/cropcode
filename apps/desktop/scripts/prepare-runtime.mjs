// Build the payload from the current CLI bundle for the requested Electron target.
// Never select a pre-existing release archive: it may contain stale code or a host-only addon.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Arch } from "builder-util";
import { buildShellEnv } from "../../../packages/core/dist/common/shell-utils.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

export function prepareRuntime(platform, arch) {
  const os = { darwin: "mac", win32: "win", linux: "linux" }[platform];
  if (!os || !["x64", "arm64"].includes(arch)) throw new Error(`不支持的桌面目标: ${platform}-${arch}`);
  const cliDist = join(repoRoot, "packages/cli/dist");
  for (const file of ["cli.js", "web/index.html", "web/app.js", "web/style.css"])
    if (!existsSync(join(cliDist, file))) throw new Error(`缺少构建产物 ${file}，请先在根目录运行 npm run build。`);
  const version = readJson(join(appRoot, "package.json")).version;
  if (version !== readJson(join(repoRoot, "package.json")).version) throw new Error("桌面版本与仓库版本不一致。");
  const sharpVersion = readJson(join(repoRoot, "package-lock.json")).packages["node_modules/sharp"].version;
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(npmCli)) throw new Error("请通过 npm run prepare:runtime 或 package:dist 执行。");
  const parent = join(appRoot, "resources", `${os}-${arch}`);
  mkdirSync(parent, { recursive: true });
  const temporary = mkdtempSync(join(parent, ".prepare-"));
  chmodSync(temporary, 0o700);
  const payload = join(temporary, "cropcode");
  mkdirSync(payload);
  const environment = buildShellEnv(process.env.SHELL || "/bin/sh");
  for (const key of Object.keys(environment)) if (/^npm_config_/i.test(key)) delete environment[key];
  try {
    mkdirSync(join(payload, "dist"));
    for (const file of ["cli.js", "chunks", "templates", "bundled", "web"])
      cpSync(join(cliDist, file), join(payload, "dist", file), { recursive: true });
    cpSync(join(repoRoot, "LICENSE"), join(payload, "LICENSE"));
    writeFileSync(
      join(payload, "package.json"),
      JSON.stringify(
        {
          name: "cropcode-desktop-runtime",
          private: true,
          version,
          type: "module",
          dependencies: { sharp: sharpVersion },
        },
        null,
        2
      ) + "\n"
    );
    const npmrc = join(temporary, "build.npmrc");
    const globalNpmrc = join(temporary, "global.npmrc");
    writeFileSync(npmrc, "", { mode: 0o600, flag: "wx" });
    writeFileSync(globalNpmrc, "", { mode: 0o600, flag: "wx" });
    execFileSync(
      process.execPath,
      [
        npmCli,
        "install",
        "--prefix",
        payload,
        "--userconfig",
        npmrc,
        "--globalconfig",
        globalNpmrc,
        "--registry=https://registry.npmjs.org",
        "--omit=dev",
        "--include=optional",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        `--os=${platform}`,
        `--cpu=${arch}`,
        ...(platform === "linux" ? ["--libc=glibc"] : []),
      ],
      { env: environment, stdio: "inherit" }
    );
    const addonDir = `node_modules/@img/sharp-${platform}-${arch}/lib`;
    const addons = existsSync(join(payload, addonDir))
      ? readdirSync(join(payload, addonDir)).filter((name) => name.endsWith(".node"))
      : [];
    if (addons.length !== 1) throw new Error(`缺少目标平台原生模块: ${addonDir}`);
    const addon = `${addonDir}/${addons[0]}`;
    // Record the exact bundle and native dependency shipped in each target.
    const files = ["dist/cli.js", "dist/web/index.html", "dist/web/app.js", "dist/web/style.css", "package-lock.json"];
    const nativePackages = readdirSync(join(payload, "node_modules/@img")).filter((name) => name.startsWith("sharp-"));
    if (nativePackages.some((name) => !name.endsWith(`${platform}-${arch}`)))
      throw new Error("运行时混入其他平台的原生依赖。");
    writeFileSync(
      join(payload, "manifest.json"),
      JSON.stringify(
        {
          product: "CropCode Desktop",
          version,
          target: `${platform}-${arch}`,
          sharpVersion,
          nativeAddon: addon,
          builtAt: new Date().toISOString(),
          sha256: Object.fromEntries(files.map((file) => [file, hash(join(payload, file))])),
        },
        null,
        2
      ) + "\n"
    );
    const destination = join(parent, "cropcode");
    rmSync(destination, { recursive: true, force: true });
    renameSync(payload, destination);
    console.log(`✓ 当前源码运行时: ${version} / ${platform}-${arch} → ${destination}`);
    return destination;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export default async function beforePack(context) {
  prepareRuntime(context.electronPlatformName, Arch[context.arch]);
}

// Inspect the output, not the staging folder: generic extraResources copying
// deliberately omits a root node_modules directory unless copied separately.
export async function afterPack(context) {
  const payload = join(context.packager.getResourcesDir(context.appOutDir), "cropcode");
  const manifest = readJson(join(payload, "manifest.json"));
  const target = `${context.electronPlatformName}-${Arch[context.arch]}`;
  if (manifest.target !== target) throw new Error(`成品运行时架构错误: ${manifest.target} != ${target}`);
  for (const [file, expected] of Object.entries(manifest.sha256)) {
    if (hash(join(payload, file)) !== expected) throw new Error(`成品文件校验失败: ${file}`);
  }
  const sharpMain = readJson(join(payload, "node_modules/sharp/package.json")).main;
  for (const file of [manifest.nativeAddon, `node_modules/sharp/${sharpMain}`])
    if (!existsSync(join(payload, file))) throw new Error(`安装包缺少运行时依赖: ${file}`);
  console.log(`✓ 成品运行时校验: ${target} / 界面、内核及原生依赖齐全`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  prepareRuntime(args[0] || process.platform, args[1] || process.arch);
}
