# CropCode Desktop(Electron 薄壳)

桌面端是 CLI `web` 主机外的一层 Electron 壳:**不实现第二套 UI**,加载的就是 `packages/cli/resources/web` 的同一界面;不要求系统 Node.js——壳复用 Electron 二进制以 `ELECTRON_RUN_AS_NODE=1` 运行 sidecar。CLI、Web、Desktop 由此对齐同一内核。

桌面工作台采用任务侧栏、历史搜索、居中的新任务输入框与按需展开的项目文件面板，深浅色跟随系统。macOS 使用原生红绿灯与可拖动标题栏。完整交互见 [工作台说明](../../docs/web.md) / [English](../../docs/web_en.md)。

## 架构

```
main.ts ── findFreePort() ──> spawn(Electron-as-Node, cli.js web --port N)
        └─ 解析 stdout 的 #token URL ──> BrowserWindow.loadURL
单实例锁 │ will-navigate 仅允许 sidecar origin │ 窗口打开一律拒绝
退出:kill sidecar 并等待其退出(静默清理),3 秒后强杀
```

- `src/preload.cts`:编译为沙箱兼容的 CommonJS，仅暴露桌面标记与平台名称。
- `src/sidecar.ts`:纯逻辑(命令构造、URL 解析、端口探测),node:test 覆盖。
- `scripts/smoke-sidecar.mjs`:无需 Electron 二进制的 sidecar 契约冒烟(spawn → 解析 → 页面/资产/握手/认证),CI 可跑。
- `scripts/prepare-runtime.mjs`:electron-builder 的 `beforePack` 钩子。直接从当前 `packages/cli/dist` 复制界面、内核与资产，按目标平台/架构安装锁定版本的 Sharp 原生依赖，并生成文件哈希清单。各目标暂存于 `resources/<os>-<arch>/cropcode`，不会读取旧的 release 压缩包。

## 命令

```sh
npm run build          # tsc 编译壳
npm test               # sidecar 单元测试
node scripts/smoke-sidecar.mjs          # sidecar 契约冒烟(无需 Electron)
npm run dev            # 启动桌面壳(需已 npm install 且 Electron 二进制就绪)
npm run smoke          # 窗口级冒烟(CROPCODE_DESKTOP_SMOKE=1,加载成功即退出)
npm run package:dir    # 当前平台应用目录（需先在仓库根目录 npm run build）
npm run package:dist -- --mac --arm64   # Apple Silicon DMG
npm run package:dist -- --mac --x64     # Intel Mac DMG
npm run package:dist -- --win --x64     # Windows x64 NSIS 安装器
```

## 说明

- Electron 二进制下载约 100MB;受限网络下可设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 后重装。
- 打包图标来自 `build/icon.png`(1024×1024,源 `docs/assets/icon.png`);electron-builder 自动生成 icns/ico。
- 安全边界与 Web 模式一致:服务只监听 127.0.0.1 + 一次性 token;窗口 `contextIsolation` + `sandbox` 开启,禁用 nodeIntegration,导航仅限 sidecar origin。

## 安装包

产物位于 `apps/desktop/release/`，文件名包含版本、系统与架构。以上命令在 `apps/desktop` 目录运行；从仓库根目录运行时加 `--workspace=cropcode-desktop`。先在根目录执行 `npm run build`，确保打入的是当前代码。Electron 版本固定，原生依赖按目标平台准备；打包命令不会发布到远端。

安装版启动时先选择项目文件夹，再进入工作台。macOS 将 DMG 内的 CropCode 拖入 Applications；Windows 使用安装向导选择目录。macOS 默认使用本地 ad-hoc 签名保证包结构完整，但不具备开发者身份签名与公证；公开分发时需显式覆盖 `mac.identity` 并配置证书与公证。Windows 未配置证书时不具备开发者身份签名。跨平台生成的 Windows 安装包仍需在 Windows 上进行安装、启动与卸载验收。Windows Shell 工具依赖 Git for Windows 的 Bash。
