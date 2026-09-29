import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Emitter, VSBuffer, ChannelServer } from "@zcode/rpc";
import { createLocalServices, disposeServiceResourcesAndWait } from "@zcode/services/node";
import { IZCodeAgentService, createZCodeAgentConnectionScope } from "@zcode/services";

// The extension only relays messages. This process owns the same services as desktop.
const directory = dirname(fileURLToPath(import.meta.url));
const services = createLocalServices({
  zcodeBuiltinProviderConfigFilePath: join(directory, "provider.json"),
  zcodeAgentCommandResolver: ({ workspacePath }) => ({
    command: process.execPath,
    args: [join(directory, "agent.cjs"), "app-server", "--stdio"],
    storagePreparationEntry: join(directory, "agent.cjs"),
    cwd: workspacePath,
  }),
  cuaProductMcpServerResolver: {
    resolveMcpServers: async (servers) => servers,
    restart: async () => {},
    restartAfterPermissionGrant: async () => {},
  },
});
const incoming = new Emitter<VSBuffer>();
const scope = createZCodeAgentConnectionScope(services.get(IZCodeAgentService), {
  connectionId: `vscode-${process.pid}`,
  clientMode: "desktop-continuous",
  role: "trusted-host-relay",
});
const channel = new ChannelServer(
  {
    onMessage: incoming.event,
    send: (buffer) => process.send?.({ type: "rpc", data: Array.from(buffer.buffer) }),
  },
  "vscode",
);
services.exposeOnChannelServer(channel, new Map([[IZCodeAgentService.channelName, scope.service]]));
process.on("message", (message: { type?: string; data?: number[] }) => {
  if (message.type === "rpc" && Array.isArray(message.data)) {
    incoming.fire(VSBuffer.wrap(Uint8Array.from(message.data)));
  }
});
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  channel.dispose();
  incoming.dispose();
  try {
    await scope.dispose();
    await disposeServiceResourcesAndWait(services);
  } finally {
    process.exit(0);
  }
}
process.on("disconnect", () => void stop());
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
