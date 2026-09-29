import * as vscode from "vscode";
import { fork, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

let panel: vscode.WebviewPanel | undefined;
const children = new Set<ChildProcess>();
const exits = new Set<Promise<void>>();

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("CropCode");
  context.subscriptions.push(output);
  context.subscriptions.push(
    vscode.commands.registerCommand("cropcode.open", async () => {
      if (!vscode.workspace.isTrusted) return;
      if (panel) {
        panel.reveal();
        return;
      }
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspacePath) {
        await vscode.window.showInformationMessage("请先打开一个科研项目文件夹。");
        return;
      }
      const current = vscode.window.createWebviewPanel(
        "cropcode",
        "CropCode",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist")],
        },
      );
      panel = current;
      let child: ChildProcess | undefined;
      const subscription = current.webview.onDidReceiveMessage(async (message) => {
        if (message.type === "ready" && !child) {
          const runtime = join(context.extensionPath, "dist", "runtime");
          child = fork(join(runtime, "host.cjs"), [], {
            execPath: join(runtime, process.platform === "win32" ? "node.exe" : "node"),
            cwd: workspacePath,
            stdio: ["ignore", "ignore", "pipe", "ipc"],
            execArgv: [],
            env: {
              ...buildHostEnv(process.env),
              ELECTRON_RUN_AS_NODE: "1",
              ZCODE_DESKTOP_CONTEXT_PROMPT_ENABLED: "0",
            },
          });
          children.add(child);
          const owned = child;
          const exit = new Promise<void>((resolve) =>
            owned.once("close", () => {
              children.delete(owned);
              void current.webview.postMessage({ type: "closed" });
              resolve();
            }),
          );
          exits.add(exit);
          void exit.finally(() => exits.delete(exit));
          child.on("message", (data) => void current.webview.postMessage(data));
          child.on("error", (error) => {
            output.appendLine(error.message);
            void vscode.window.showErrorMessage(`CropCode 内核启动失败：${error.message}`);
          });
          // Runtime logs remain local; provider credentials are never requested by this adapter.
          child.stderr?.on("data", (data: Buffer) => output.append(data.toString()));
          await current.webview.postMessage({ type: "workspace", path: workspacePath });
        } else if (message.type === "rpc" && child?.connected) {
          child.send(message);
        } else if (message.type === "platform" && typeof message.id === "number") {
          try {
            const result = await platformCall(message.method, message.args ?? []);
            await current.webview.postMessage({ type: "result", id: message.id, result });
          } catch (error) {
            await current.webview.postMessage({
              type: "result",
              id: message.id,
              error: String(error),
            });
          }
        }
      });
      current.onDidDispose(() => {
        subscription.dispose();
        if (child?.connected) child.disconnect();
        if (panel === current) panel = undefined;
      });
      try {
        const root = vscode.Uri.joinPath(context.extensionUri, "dist", "webview");
        const base = current.webview.asWebviewUri(root).toString() + "/";
        const nonce = randomBytes(16).toString("hex");
        let html = await readFile(vscode.Uri.joinPath(root, "index.html").fsPath, "utf8");
        html = html.replaceAll('src="./', `src="${base}`).replaceAll('href="./', `href="${base}`);
        html = html.replaceAll("<script ", `<script nonce="${nonce}" `);
        const source = current.webview.cspSource;
        html = html.replace(
          "<head>",
          `<head><base href="${base}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${source}; style-src ${source} 'unsafe-inline'; img-src ${source} data: blob:; font-src ${source} data:; connect-src ${source}; worker-src ${source} blob:; media-src ${source} blob: data:;">`,
        );
        current.webview.html = html;
      } catch (error) {
        current.dispose();
        throw error;
      }
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("cropcode.terminal", () => {
      if (!vscode.workspace.isTrusted) return;
      const runtime = join(context.extensionPath, "dist", "runtime");
      vscode.window
        .createTerminal({
          name: "CropCode",
          shellPath: join(runtime, process.platform === "win32" ? "node.exe" : "node"),
          shellArgs: [join(runtime, "agent.cjs")],
          env: { ZCODE_BUILTIN_PROVIDER_CONFIG_FILE: join(runtime, "provider.json") },
        })
        .show();
    }),
  );
}

async function platformCall(method: string, args: unknown[]) {
  switch (method) {
    case "selectDirectory": {
      const selected = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
      });
      return selected?.[0]?.fsPath ?? null;
    }
    case "selectFile":
    case "selectFiles": {
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: method === "selectFiles",
      });
      return method === "selectFiles"
        ? (selected?.map((uri) => uri.fsPath) ?? [])
        : (selected?.[0]?.fsPath ?? null);
    }
    case "openExternal": {
      const uri = vscode.Uri.parse(String(args[0]));
      if (!["https", "http", "mailto"].includes(uri.scheme)) throw new Error("不支持的链接类型。");
      await vscode.env.openExternal(uri);
      return;
    }
    case "openFile":
      await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(String(args[0])));
      return { success: true };
    case "revealFile":
      await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(String(args[0])));
      return { success: true };
    default:
      throw new Error("不支持的平台操作。");
  }
}

export async function deactivate() {
  panel?.dispose();
  for (const child of children) if (child.connected) child.disconnect();
  await Promise.allSettled(exits);
}

function buildHostEnv(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !/(KEY|SECRET|TOKEN|PASSWORD)/i.test(key)),
  );
}
