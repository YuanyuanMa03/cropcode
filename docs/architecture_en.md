# CropCode architecture

CropCode is a TypeScript npm-workspaces project. `packages/core` handles sessions, provider configuration, agricultural instructions, tools, permissions, checkpoints, Skills and MCP. `packages/cli` supplies the terminal UI; `packages/vscode-ide-companion` supplies the editor UI.

Model requests use the configured provider. Search uses a custom script or the direct DeepSeek API; image understanding requires a multimodal model. There is no product-specific proxy, subscription platform, media-generation service or usage reporting.

See [configuration](configuration_en.md), [technical provenance](upstream.md) and [LICENSE](../LICENSE). No unmeasured performance or benchmark claim is made here.
