# CropCode

**A research workspace where crop models meet field questions.**

CropCode 2.0 brings desktop and terminal interfaces to one execution kernel. Work with model code, parameters, weather and soil data, observations and simulation results.

- Projects, tasks, streaming responses, file previews, terminals, tool permissions and session history.
- User-configured endpoints and models through Anthropic Messages, Chat Completions or Responses.
- No product account, subscription, onboarding, marketplace or telemetry. No provider is preselected.
- Chinese functional labels, a restrained sage palette and dark mode.

## Use

Add a model in desktop Settings → Models, then open a project.

Run `cropcode` for the TUI, or configure a provider and run a single task:

```sh
cropcode configure --provider-name "Research model" \
  --base-url "https://your-endpoint.example/v1" \
  --api-format openai-chat-completions --model-id your-model \
  --api-key-env MODEL_API_KEY --context-window 65536
cropcode --cwd /path/to/project --prompt "Check weather input units and missing values"
```

Supply `MODEL_API_KEY` securely through the local environment. Desktop and terminal share `~/.cropcode-desktop/v2/provider_config.json`. Legacy data is not imported automatically. Single-prompt commands default to build permissions; unrestricted `--mode yolo` requires an explicit flag.

## Build locally

Use Node 24.14.0 and pnpm 10.33.2.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build:cli
pnpm prepare:desktop-runtime
pnpm build:desktop
pnpm check
pnpm test:product
```

Dependency installation does not run third-party install scripts. Prepare and verify Electron and native runtimes for the target platform. Workspace package names are internal build identifiers. See [architecture](docs/architecture_en.md) and the [renewal record](docs/desktop-renewal_en.md).

The version is **2.0.0**. Artifacts are under local acceptance testing and have not been published as a stable release. The version number does not imply completed signing, cross-platform or live-provider validation.

[中文](README.md) · [License](LICENSE) · [Third-party notices](NOTICE.md)
