# CropCode

A terminal AI coding assistant for agricultural research, with a green terminal UI, agriculture-focused instructions, and multiple model providers.

[中文](README.md) · [Configuration](docs/configuration_en.md) · [Providers](docs/providers.md)

## Install

Requires Node.js 22 or later and npm:

```bash
npm install -g https://github.com/YuanyuanMa03/cropcode/releases/download/v2.2.0/cropcode-cli-2.2.0.tgz
cropcode
```

The package downloads platform-specific image-processing dependencies during installation.

Without an existing API configuration, the CLI starts a login wizard. Use `/login` to switch providers and `/model` to select a model and thinking settings. Built-in providers are DeepSeek, Zhipu GLM, Alibaba Qwen, Xiaomi MiMo, and LongCat. Availability and pricing depend on the provider and account.

CropCode supports streamed conversations, tool execution, permissions, checkpoints, session resume/fork, Plan Mode, Skills, MCP, images, and non-interactive `cropcode --exec --prompt "..."`. Agricultural instructions emphasize data provenance, units, experimental design, reproducibility, and honest reporting. Crop simulators and datasets must be supplied by the project; they are not bundled.

Configuration precedence: `CROPCODE_*` environment variables, project settings, user settings, saved login credentials, then defaults. Web search uses a configured script or the direct DeepSeek API. Image understanding requires a multimodal model. There is no bundled media-generation service, usage reporting, or other product credential fallback.

## Development

```bash
npm ci
npm run check
npm test
npm run build
npm run package:cli
```

The repository uses npm workspaces: core, CLI, and a VSCode companion. See [release notes](CHANGELOG.md) for the 2.2.0 migration scope.

## License and references

MIT. Includes third-party MIT-licensed code. Copyright notices are retained in [LICENSE](LICENSE); technical provenance is recorded in [docs/upstream.md](docs/upstream.md).
