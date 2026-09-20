# CropCode Desktop(Electron 薄壳)

桌面端是 CLI `web` 主机外的一层 Electron 壳(架构对齐 DeepSeek Harness desktop):**不实现第二套 UI**,加载的就是 `packages/cli/resources/web` 的同一界面;不要求系统 Node.js——壳复用 Electron 二进制以 `ELECTRON_RUN_AS_NODE=1` 运行 sidecar(DSH 的运行时技巧)。CLI、Web、Desktop 由此对齐同一内核。

## 架构

```
main.ts ── findFreePort() ──> spawn(Electron-as-Node, cli.js web --port N)
        └─ 解析 stdout 的 #token URL ──> BrowserWindow.loadURL
单实例锁 │ will-navigate 仅允许 sidecar origin │ 窗口打开一律拒绝
退出:kill sidecar 并等待其退出(静默清理),3 秒后强杀
```

- `src/sidecar.ts`:纯逻辑(命令构造、URL 解析、端口探测),node:test 覆盖。
- `scripts/smoke-sidecar.mjs`:无需 Electron 二进制的 sidecar 契约冒烟(spawn → 解析 → 页面/资产/握手/认证),CI 可跑。
- `scripts/prepare-runtime.mjs`:打包前把 `release/cropcode-<版本>-<平台>` 独立运行时拷入 `resources/cropcode`,经 electron-builder `extraResources` 分发。

## 命令

```sh
npm run build          # tsc 编译壳
npm test               # sidecar 单元测试
node scripts/smoke-sidecar.mjs          # sidecar 契约冒烟(无需 Electron)
npm run dev            # 启动桌面壳(需已 npm install 且 Electron 二进制就绪)
npm run smoke          # 窗口级冒烟(CROPCODE_DESKTOP_SMOKE=1,加载成功即退出)
npm run package:dir    # 打包(先自动拷独立运行时,需 npm run package:standalone 产物)
```

## 说明

- Electron 二进制下载约 100MB;受限网络下可设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 后重装。
- 打包图标来自 `build/icon.png`(1024×1024,源 `docs/assets/icon.png`);electron-builder 自动生成 icns/ico。
- 安全边界与 Web 模式一致:服务只监听 127.0.0.1 + 一次性 token;窗口 `contextIsolation` + `sandbox` 开启,禁用 nodeIntegration,导航仅限 sidecar origin。
