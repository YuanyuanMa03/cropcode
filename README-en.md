<p align="center">
  <img src="docs/assets/cropcode-banner.svg" alt="CropCode — AI Coding Agent for Agricultural Research" width="100%">
</p>

<h1 align="center">CropCode 🌱</h1>

<p align="center"><strong>From field questions to working code.</strong><br>A terminal AI coding assistant for agricultural research.</p>

<p align="center">
  <a href="https://github.com/YuanyuanMa03/cropcode/releases"><img src="https://img.shields.io/github/v/release/YuanyuanMa03/cropcode?color=37865b&amp;label=release" alt="GitHub release"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-22%2B-417e38" alt="Node.js 22 or later"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-c4a657" alt="MIT license"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#from-question-to-results">Interaction walkthrough</a> ·
  <a href="docs/quickstart_en.md">User guide</a> ·
  <a href="docs/providers.md">Providers</a> ·
  <a href="README.md">中文</a>
</p>

---

CropCode works inside your project: it reads data and code, discusses an analysis plan, writes Python/R scripts, runs commands, and shows tool activity in the terminal. Use it for field trials, remote sensing, crop modeling, or everyday software development.

| 🌾 Research context | 🖥️ Work in your project | 🔌 Choose your model |
| --- | --- | --- |
| Agricultural instructions emphasize units, experimental design, provenance, and reproducibility | A green terminal interface with file operations, Shell execution, and visible tool output | Built-in connection presets for DeepSeek, GLM, Qwen, MiMo, and LongCat |

## See it in action

<a href="docs/assets/cropcode-terminal.png">
  <img src="docs/assets/cropcode-terminal.png" alt="Real CropCode terminal session: welcome panel, GLM configuration, and a self-introduction that loads a skill and reads documentation" width="100%">
</a>

<p align="center"><sub>Real terminal capture · Welcome screen and start of a self-introduction · Click for the full 3840 × 2160 image</sub></p>

The capture shows a question triggering the `cropcode-self-refer` skill, a documentation read, and the beginning of an answer. The panel displays the provider, model, thinking settings, and working directory. Wallpaper and transparency belong to the user's terminal configuration.

## Quick start

Requires **Node.js 22+** and an API key for your chosen provider.

```bash
npm install -g https://github.com/YuanyuanMa03/cropcode/releases/download/v2.2.0/cropcode-cli-2.2.0.tgz

# Start inside your project directory
cropcode
```

Without an API key configured, the login wizard walks through **provider → connection type → model → API key**. Existing settings are reused. Run `/login` to change the provider later.

> **Version scope:** this command installs the published **2.2.0** release. This page describes current `main`; see the [changelog](CHANGELOG.md) for subsequent changes. Installation downloads platform-specific image-processing dependencies.

<details>
<summary><strong>Run the latest source / install a downloaded package</strong></summary>

```bash
git clone https://github.com/YuanyuanMa03/cropcode.git
cd cropcode
npm ci
npm start
```

This repository uses npm workspaces and `package-lock.json`. Alternatively, download the `.tgz` from [GitHub Releases](https://github.com/YuanyuanMa03/cropcode/releases):

```bash
npm install -g ./cropcode-cli-2.2.0.tgz
cropcode --version
```

</details>

## From question to results

The following is a **usage example, not a completed experiment**. Replace paths with your own data.

```text
Open project → Choose model → Discuss plan → Approve implementation → Inspect outputs
                                   ↑                                      |
                                   └──── Refine the requirements ──────────┘
```

**1. Introduce your data.** Use `@` to reference files:

```text
Inspect @data/field_trial.csv for missing values, yield units, and block structure.
List questions that need my input. Preserve the source data and do not infer missing units.
```

**2. Plan the analysis.** Enter `/plan` or press `Shift+Tab`, then ask:

```text
Plan an R analysis using the experimental design we just verified.
Explain the model choice, diagnostics, figures, and output files. Do not implement yet.
```

**3. Choose what happens next.** Once a complete plan is returned, the `Plan ready` menu offers `implement this plan` or `stay in Plan mode`, among other options. During execution, inspect file operations and command output. Permission prompts appear when required by your rules.

**4. Verify the actual outputs.** Ask CropCode to run the script and list the generated files, commands, checks, and anything still unverified. Inspect the artifacts yourself. Press `Esc` to interrupt, `/resume` to return later, or `/undo` to restore tracked files and/or conversation checkpoints.

[Full interaction guide →](docs/quickstart_en.md)

## Bring your research problem

These are possible tasks and requested deliverables, using your actual data and installed tools.

| Research task | Work you can request | Deliverables to inspect |
| --- | --- | --- |
| Field trials | Inspect missing data, repeated observations, blocks, and analysis assumptions | R/Python scripts, checks, statistical tables |
| Remote sensing | Check bands, CRS, scale factors, and cloud masks before calculating vegetation indices | Processing scripts, rasters, quality records |
| Crop models | Validate inputs and automate model runs or sensitivity analysis | Input checks, run configurations, comparison plots |
| Scientific figures | Plot results with explicit units, grouping, and uncertainty definitions | Plotting code, figures, reproduction steps |
| Software engineering | Read a repository, diagnose issues, edit code, and run relevant tests | Code changes, test output, change notes |

Agricultural instructions ask the model to check provenance, units, time, coordinates, and experimental design; label simulated data; and avoid fabricated citations or results. These instructions do not replace scientific review. Crop simulators such as DSSAT, APSIM, and WOFOST, weather databases, and experimental datasets must be supplied by your project.

## Keep work moving

| Capability | How it helps |
| --- | --- |
| Files and Shell | Read, create, and edit files; execute foreground or background commands |
| Plan Mode and permissions | Discuss a plan before implementation; configure allow, ask, and deny scopes |
| Sessions and checkpoints | Resume work, fork discussions, or restore tracked files and conversation history |
| Skills and project instructions | Reuse workflows, create project instructions with `/init`, inspect `/skills` |
| MCP | Connect external tool servers and inspect their status with `/mcp` |
| Long sessions and automation | Streaming, retries, context compaction, and non-interactive execution |
| Images and editor integration | Use multimodal models for image input; build the VSCode companion sharing the same core |

Useful commands: `/login`, `/model`, `/plan`, `/new`, `/resume`, `/fork`, `/undo`, `/skills`, `/mcp`, `/raw`, `/exit`.

```bash
cropcode --exec --prompt "Summarize this repository and its test entry points without modifying files."
cropcode --help
```

Non-interactive mode cannot answer questions or permission prompts; handle those in an interactive session. Search uses a configured `webSearchTool` script or the direct DeepSeek API's built-in search. Image understanding requires a multimodal model.

## Choose your provider

| Provider | Built-in connection presets |
| --- | --- |
| DeepSeek | API |
| Zhipu GLM | API / Coding Plan |
| Alibaba Qwen | API / Coding Plan |
| Xiaomi MiMo | API / Token Plan |
| LongCat | API |

Use `/login` for credentials and endpoints, and `/model` for model and thinking settings. The menu tries the configured `/models` endpoint and falls back to presets and the current model. Availability, plan eligibility, and pricing depend on your provider account. Compatible custom API endpoints and model IDs can also be configured.

Precedence: **`CROPCODE_*` environment variables → project settings → user settings → saved credentials → defaults**. Check higher-priority overrides if a change does not take effect. [Provider details →](docs/providers.md)

## Documentation

| Topic | Guide |
| --- | --- |
| First session, controls, and commands | [Quickstart](docs/quickstart_en.md) |
| Settings and models | [Configuration](docs/configuration_en.md) · [Providers](docs/providers.md) |
| Planning and execution rules | [Plan Mode](docs/plan-mode_en.md) · [Permissions](docs/permission_en.md) |
| Resume, fork, and undo | [Sessions](docs/session-persistence_en.md) |
| Project context and extensions | [AGENTS.md](docs/agents-md_en.md) · [Skills](docs/agent-skills_en.md) · [MCP](docs/mcp_en.md) |
| Architecture and releases | [Architecture](docs/architecture_en.md) · [Changelog](CHANGELOG.md) |

## Development

```bash
npm ci
npm run check
npm test
npm run build
npm run build:vscode
npm run package:cli
```

The npm workspaces are `packages/core`, `packages/cli`, and `packages/vscode-ide-companion`. Report bugs and suggestions through [Issues](https://github.com/YuanyuanMa03/cropcode/issues), including the version, environment, reproduction steps, and sanitized output.

## License

[MIT](LICENSE). Includes third-party MIT-licensed code with required copyright notices retained. See [technical provenance](docs/upstream.md).
