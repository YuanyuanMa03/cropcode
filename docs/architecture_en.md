# CropCode architecture

CropCode 2.0 ships only desktop and terminal entry points around one Agent kernel. Both reuse provider configuration, the execution loop, tool permissions and session storage. The legacy kernel is retired.

| Layer     | Location                                    | Responsibility                                                   |
| --------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Desktop   | `packages/desktop`                          | Electron windows, local host and runtime assembly                |
| Terminal  | `apps/zcode-cli/packages/cli`, `tui`        | CLI and terminal interaction over the shared Agent               |
| UI        | `packages/ui`                               | Projects, tasks, files, model settings and research entry points |
| Services  | `packages/services`                         | Session index, storage, terminal, files and model services       |
| Providers | `packages/provider`, `provider-node`        | Templates, model selection and persistence                       |
| Protocol  | `packages/rpc`, `client`, `shared`          | Shared types and service calls                                   |
| Agent     | `apps/zcode-cli/packages/core`, `bootstrap` | Execution, context, tools, permissions and model requests        |

Desktop uses the React UI and local services. The terminal directly calls the same Agent libraries through a TUI or single-prompt command. Its standalone archive assembles the Agent, Node and native dependencies without relying on an editor extension build.

Provider configuration is stored in `~/.cropcode-desktop/v2/provider_config.json` with mode 0600. Desktop settings and `cropcode configure` use the shared configuration service. CLI configuration reads credentials from a named environment variable, not a plaintext command argument. No provider is preselected. Anthropic Messages, Chat Completions and Responses are supported; users configure their endpoint, model and credentials.

Shared session storage does not guarantee concurrent editing of an active session from multiple clients. Cross-process live takeover and multi-client collaboration are not currently promised.

## Product boundaries

The interface focuses on projects, tasks, files, terminals and changes. Onboarding, occupation surveys, marketplace, product accounts, subscriptions and remote workspace entry points are removed. Default plugin and marketplace sets are empty; user-configured local skills and MCP remain supported. Telemetry, remote product configuration and automatic updates are disabled. Required Node/Electron, search and native terminal runtimes remain bundled.

`packages/web`, `packages/vscode` and remote service sources remain internal inherited modules, not delivery entry points. The editor extension is excluded from the workspace and no VSIX is built or published. Internal package and protocol identifiers are retained to limit change risk. Public labels, OS identity and deep links use CropCode. Third-party provenance and licensing are maintained in NOTICE and third-party notices.

## Research interaction

The default palette is light gray and sage, with dark mode and keyboard focus retained. Functional labels remain direct. Research shortcuts only prefill editable prompts; they do not fabricate tasks or results. Agent instructions require unit and scale checks, separation of calibration and independent validation, preservation of raw data and reporting of actual commands, parameters and outputs. They do not replace scientific review.

## Validation

`pnpm check` includes shared, desktop main and CLI type checks, lint and formatting. `pnpm test:product` checks product boundaries and provider configuration. Built artifacts require real TUI and Electron startup and task checks. Live-provider and deterministic local-fixture results are recorded separately; see the renewal record for packaging and signing status.
