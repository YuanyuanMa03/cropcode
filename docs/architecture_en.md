# CropCode architecture

CropCode is a TypeScript npm-workspaces project. `packages/core` handles sessions, provider configuration, agricultural instructions, tools, permissions, checkpoints, Skills and MCP. `packages/cli` supplies the terminal UI; `packages/vscode-ide-companion` supplies the editor UI. `packages/cli/src/web/server.ts` and `packages/cli/resources/web/` supply the loopback-only Web host and no-build task workspace. History search and file references reuse existing session and file-lookup APIs.

`apps/desktop` is a thin Electron shell that starts the same Web host and loads the same interface. It owns native windows and service lifecycle. The sandboxed preload compiles to CommonJS and exposes only a desktop marker and platform name, without Node or filesystem access.

`apps/web` and `packages/ui` provide an independent React/Vite design preview for the three-surface upgrade. It uses fixtures and is not connected to core or the current desktop release. See the [workbench preview](workbench-preview_en.md) for commands and scope.

Model requests use the configured provider. Search uses a custom script or the direct DeepSeek API; image understanding requires a multimodal model. There is no product-specific proxy, subscription platform, media-generation service or usage reporting.

See [configuration](configuration_en.md) and [LICENSE](../LICENSE). No unmeasured performance or benchmark claim is made here.
