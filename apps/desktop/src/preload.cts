// Sandboxed preloads run as plain scripts; ESM imports cannot execute here.
// https://www.electronjs.org/docs/latest/tutorial/esm#sandboxed-preload-scripts-cant-use-esm-imports
import { contextBridge } from "electron";

// Minimal, read-only surface: the web client can detect it runs inside the
// desktop shell, nothing more. No node integration, no IPC channels.
contextBridge.exposeInMainWorld("cropcodeDesktop", { desktop: true, platform: process.platform } as const);
