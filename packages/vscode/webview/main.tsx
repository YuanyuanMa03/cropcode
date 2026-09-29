import { createRoot } from "react-dom/client";
import { ChannelClient, Emitter, VSBuffer } from "@zcode/rpc";
import { RemoteServiceAccess } from "@zcode/client";
import { Root, AppErrorBoundary, ZCodeIntlProvider, setStreamClientId } from "@zcode/ui";
import "@zcode/ui/styles.css";
import "./host.css";
import { createWebPlatform } from "./platform.js";

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };
const vscode = acquireVsCodeApi();
const messages = new Emitter<VSBuffer>();
const client = new ChannelClient({
  onMessage: messages.event,
  send: (buffer) => vscode.postMessage({ type: "rpc", data: Array.from(buffer.buffer) }),
});
const services = new RemoteServiceAccess(client, { windowController: false });
let sequence = 0;
const pending = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();
function call<T>(method: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve: (value) => resolve(value as T), reject });
    vscode.postMessage({ type: "platform", id, method, args });
  });
}
const platform = createWebPlatform();
platform.canSelectFilePath = true;
platform.selectDirectory = () => call("selectDirectory");
platform.selectFile = () => call("selectFile");
platform.selectFiles = () => call("selectFiles");
platform.openExternal = (url) => {
  void call("openExternal", url);
};
platform.openExternalFile = (path) => call("openFile", path);
platform.openInFileManager = (path) => call("revealFile", path);
platform.openInEditor = (_editor, path) => call("openFile", path);
setStreamClientId(crypto.randomUUID());
document.documentElement.classList.add("theme-cropcode-light");
const root = createRoot(document.getElementById("root")!);
window.addEventListener("message", ({ data }) => {
  if (data.type === "rpc" && Array.isArray(data.data))
    messages.fire(VSBuffer.wrap(Uint8Array.from(data.data)));
  if (data.type === "result") {
    const request = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) request?.reject(new Error(data.error));
    else request?.resolve(data.result);
  }
  if (data.type === "closed") {
    client.dispose(new Error("内核连接已关闭。"));
    for (const request of pending.values()) request.reject(new Error("连接已关闭。"));
    pending.clear();
    root.render(<p role="alert">内核连接已关闭，请重新打开 CropCode 工作台。</p>);
  }
  if (data.type === "workspace")
    root.render(
      <AppErrorBoundary>
        <ZCodeIntlProvider
          settingService={services.settingService}
          broadcastService={services.broadcastService}
        >
          <Root
            services={services}
            platform={platform}
            initialWorkspaceAbsPath={data.path}
            supportsSettings
            allowOpenWorkspace={false}
            allowRemoteWorkspace={false}
            supportsEmbeddedBrowser={false}
          />
        </ZCodeIntlProvider>
      </AppErrorBoundary>,
    );
});
vscode.postMessage({ type: "ready" });
