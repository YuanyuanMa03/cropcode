import { app, BrowserWindow, dialog } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSidecarSpec,
  findFreePort,
  parseWebHostUrl,
  resolveCliEntry,
  resolveRepoRoot,
  startSidecar,
  type SidecarHandle,
} from "./sidecar.js";

// CropCode desktop is a thin Electron shell around the CLI's `web` host:
// one kernel (the sidecar), one surface (the existing no-build web client).
// The shell adds window lifecycle, single-instance locking and hard
// navigation security — never a second UI implementation.

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolveRepoRoot(here);
const packagedEntry = app.isPackaged ? join(process.resourcesPath, "cropcode", "cli.js") : null;

let mainWindow: BrowserWindow | null = null;
let sidecar: SidecarHandle | null = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  void app.whenReady().then(start);

  app.on("window-all-closed", () => {
    // A tool window: closing it ends the session on every platform.
    app.quit();
  });

  // Disposal reaches quiescence: request shutdown, wait for the host to
  // release its port, then let the process leave.
  app.on("will-quit", (event) => {
    const { child } = sidecar ?? {};
    if (!child || child.exitCode !== null) return;
    event.preventDefault();
    const force = setTimeout(() => child.kill("SIGKILL"), 3000);
    child.once("exit", () => {
      clearTimeout(force);
      app.exit(0);
    });
    child.kill();
  });
}

async function start(): Promise<void> {
  const cliEntry = resolveCliEntry(repoRoot, packagedEntry);
  if (!cliEntry) {
    await fatal("找不到 CropCode 运行时", "开发模式请先在仓库根目录运行 npm run build;安装包损坏时请重新安装。");
    return;
  }
  const port = await findFreePort();
  const spec = buildSidecarSpec({ electronExecutable: process.execPath, cliEntry, port });
  sidecar = startSidecar(spec);
  const { child } = sidecar;

  let output = "";
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    output += chunk;
    const url = parseWebHostUrl(output);
    if (url) {
      child.stdout?.removeAllListeners("data");
      void openWindow(url);
    }
  });
  let errorText = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    errorText = (errorText + chunk).slice(-2000);
  });

  // Fail loudly if the host never comes up (misconfiguration fails loud).
  const timeout = setTimeout(() => {
    if (!mainWindow) {
      child.kill();
      void fatal("CropCode 服务启动超时", errorText || "本地服务 30 秒内未就绪。");
    }
  }, 30_000);

  child.once("exit", (code) => {
    clearTimeout(timeout);
    if (!mainWindow) {
      void fatal("CropCode 服务异常退出", errorText || `退出码 ${code ?? "unknown"}。`);
    }
  });
}

async function openWindow(url: string): Promise<void> {
  const allowedOrigin = new URL(url).origin;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    autoHideMenuBar: true,
    show: false,
    title: "CropCode",
    webPreferences: {
      preload: join(here, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // Hard navigation security: the window may only ever show the local host
  // the sidecar owns; everything else is refused.
  mainWindow.webContents.on("will-navigate", (event, target) => {
    if (new URL(target).origin !== allowedOrigin) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  await mainWindow.loadURL(url);

  if (process.env.CROPCODE_DESKTOP_SMOKE === "1") {
    // Headless verification hook: the page is up, report and exit cleanly.
    process.stdout.write(`SMOKE_OK ${url}\n`);
    app.quit();
  }
}

async function fatal(title: string, message: string): Promise<void> {
  if (app.isReady()) dialog.showErrorBox(title, message);
  else process.stderr.write(`${title}: ${message}\n`);
  app.quit();
}
