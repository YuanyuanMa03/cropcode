import { contextBridge } from "electron";

// Minimal, read-only surface: the web client can detect it runs inside the
// desktop shell, nothing more. No node integration, no IPC channels.
contextBridge.exposeInMainWorld("cropcodeDesktop", { desktop: true } as const);
