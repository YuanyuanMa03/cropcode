<div align="center">

<img src="resources/intro.png" alt="CropCode" width="720" />

# CropCode

**Open-source · Multi-provider · Terminal-native AI coding agent**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=22](https://img.shields.io/badge/Node.js-%3E%3D22-green.svg)](https://nodejs.org/)
[![CI](https://github.com/YuanyuanMa03/cropcode/actions/workflows/ci.yml/badge.svg)](https://github.com/YuanyuanMa03/cropcode/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/YuanyuanMa03/cropcode/pulls)

Tool execution · Permission gating · Context compaction · Hooks · MCP · Skill marketplace
DeepSeek / Zhipu GLM / Qwen / Xiaomi MiMo · Direct connectivity in mainland China · MIT

[中文](README.md) · [Architecture](docs/architecture.md) · [Configuration](docs/configuration_en.md) · [Marketplace guide](docs/marketplace-guide.md)

</div>

---

## What it is

CropCode is an AI coding agent that runs in your terminal. It connects an LLM to a complete tool-execution environment — shell, file I/O, search, web search, permission prompts — so the model can carry out multi-step engineering tasks in your project: read code, edit files, run tests, fix failures, and report back.

Compared with commercial peers (Claude Code, Codex CLI), CropCode differs in three ways:

- **Open source (MIT)** — the agent loop, tool execution, and context management are implemented from scratch: auditable, modifiable, self-hostable
- **Provider freedom** — four OpenAI-compatible providers (DeepSeek, Zhipu GLM, Qwen, Xiaomi MiMo) behind one interface, with both pay-as-you-go keys and subscription plans, directly reachable from mainland China without a proxy
- **Community skill marketplace** — skills ship as standard `SKILL.md` packages installable from any Git repository and activate automatically based on prompt intent

The project's original use case was agricultural research — data analysis and paper writing with Python/R/LaTeX workflows — but as a general-purpose agent harness it handles everyday software engineering equally well.

## Capabilities

| Capability | Details |
|------------|---------|
| **Agent loop** | Streaming inference + tool calls + autonomous multi-turn execution; thinking content rendered separately, toggle raw view with `/raw` |
| **Tool system** | 9 built-in tools (Bash, Read, Write, Edit, Grep, Glob, WebSearch, AskUserQuestion, UpdatePlan) plus dynamic MCP tool injection |
| **Permissions** | Gated per tool scope (commands / file paths / network), four default modes, decisions remembered for the session |
| **Context engineering** | Three-tier automatic compaction (auto / micro / reactive) with a circuit breaker — long sessions stay in control |
| **Sessions** | Persistence, multi-session, `/resume`, checkpoint-based `/undo` for code and conversation |
| **Hooks** | Run custom shell commands before/after tool calls, with matcher rules; can block or rewrite |
| **Skills & marketplace** | User-level / project-level / community marketplace sources; `marketplace add` + `plugin install` |
| **Reasoning adaptation** | Handles deepseek vs qwen thinking protocol differences automatically (reasoning_effort ↔ thinking_budget mapping, reasoning_content replay) |
| **Self-update** | GitHub Releases manifest check, sha256-verified versioned installs, `cropcode rollback` |
| **Multi-provider login** | Interactive TUI wizard: provider → model → key. No config files |

## Install

**One-line install** (release packages bundle a Node.js runtime):

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.ps1 | iex
```

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.sh | sh
```

**Manual install**: download the package for your platform from [GitHub Releases](https://github.com/YuanyuanMa03/cropcode/releases) —

- Windows x64: extract the ZIP, run `install.cmd` (or run `cropcode.cmd` directly without installing)
- macOS (Apple Silicon / Intel): extract the TAR.GZ, run `./install.sh`
- Linux x64: extract the TAR.GZ, run `./install.sh`

**Build from source** (requires Node.js >= 22):

```bash
git clone https://github.com/YuanyuanMa03/cropcode.git
cd cropcode
npm install
npm run build
npm link
```

## Quick start

Start it inside your project:

```bash
cropcode
```

First launch opens an interactive login wizard: pick a provider → pick a model → enter your API key.

```
 Provider
 ─────────────────────────────────────
 ▶ DeepSeek            pay-as-you-go
   Zhipu GLM           Coding Plan
   Qwen                Coding Plan
   MiMo                Token Plan

 ↑/↓ select · Enter confirm
```

Then describe the task in natural language:

```
> Read all TypeScript files under src/, find functions missing type
  annotations, add proper types, then run the test suite and report
```

CropCode works autonomously: search code → locate issues → edit files → run tests → report, prompting for permission on dangerous operations.

Switch models or providers any time with `/model` and `/login` — no restart needed.

## Providers

All four providers expose OpenAI-compatible APIs; protocol differences (thinking format, reasoning effort, streaming) are handled automatically.

| Provider | Models | Access | Thinking protocol |
|----------|--------|--------|-------------------|
| **DeepSeek** | V4 Pro · V4 Flash | API key, pay-as-you-go | deepseek format + reasoning_effort |
| **Zhipu GLM** | GLM-5.2 · 5.1 · 4.7 · 4.6 · 4.7 Flash · 4 Flash | API key / Coding Plan (Lite / Pro / Max) | deepseek format + reasoning_effort |
| **Qwen** | Qwen3.7 Max · Plus · Turbo · Qwen3 Max | API key / Coding Plan (Pro) | qwen format (thinking_budget) |
| **MiMo** | V2.5 Pro · V2.5 | Token Plan (Lite / Standard / Pro / Max) | deepseek format |

See official pages for current pricing and trial credits: [DeepSeek](https://platform.deepseek.com) · [Zhipu](https://open.bigmodel.cn) · [Qwen](https://bailian.console.aliyun.com) · [MiMo](https://platform.xiaomimimo.com).

## Architecture

npm workspaces monorepo with a strict core/UI split:

```
┌─ CLI · Ink/React terminal UI ────────────────────────
│  login wizard · streaming · permission prompts · slash commands
├─ SessionManager (core orchestration) ────────────────
│  context assembly & compaction (auto / micro / reactive + breaker)
│  checkpoints & undo · session persistence · resume
├─ Tool execution engine ──────────────────────────────
│  Bash · Read · Write · Edit · Grep · Glob
│  WebSearch · AskUserQuestion · UpdatePlan
│  permission gating · hooks · dynamic MCP tool injection
├─ LLM client ─────────────────────────────────────────
│  OpenAI-compatible protocol · dual thinking adapters · streaming
├─ Extension layer ────────────────────────────────────
│  skills · plugins · community marketplace · self-update (sha256 + rollback)
└──────────────────────────────────────────────────────
```

- `packages/core` (`@YuanyuanMa03/cropcode-core`) — headless core library: sessions, tools, permissions, hooks, MCP, marketplace; no UI dependency
- `packages/cli` (`@YuanyuanMa03/cropcode-cli`) — Ink/React terminal UI and CLI subcommands

Full design (data flow, model resolution, compaction strategy, permission evaluation) is in the [architecture document](docs/architecture.md) (Chinese), with an interactive [draw.io diagram](docs/architecture-diagram.drawio).

## Skills & marketplace

Skills are knowledge packages (a `SKILL.md` plus optional scripts) from three sources:

```bash
# Register a community marketplace (any Git repo or local path)
cropcode marketplace add https://github.com/Yuan1z0825/nature-skills.git

# Browse and install
cropcode marketplace list
cropcode plugin install <skill-name>@nature-skills
```

| Source | Location |
|--------|----------|
| Community marketplace | `marketplace add <git-url or local path>`, then install |
| User-level | `~/.agents/skills/<skill>/SKILL.md` |
| Project-level | `<project>/.agents/skills/<skill>/SKILL.md` |

See the [plugins & skills documentation](docs/plugins-skills-marketplace_en.md) and the [marketplace guide](docs/marketplace-guide.md).

## MCP integration

Connect external tool servers via the [Model Context Protocol](https://modelcontextprotocol.io/):

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }
    }
  }
}
```

Server tools join the model's tool list; check status with `/mcp`. Details in the [MCP document](docs/mcp_en.md).

## Configuration

Precedence, highest first:

1. **Credentials** — `credentials.json` (managed by the login wizard; wins whenever present)
2. **Environment** — `CROPCODE_*` variables
3. **Project** — `<project>/.cropcode/settings.json`
4. **User** — `~/.cropcode/settings.json`
5. **Built-in defaults**

Common settings:

| Field | Type | Description |
|-------|------|-------------|
| `thinkingEnabled` | boolean | Deep reasoning toggle (default from model preset) |
| `reasoningEffort` | `"max"` \| `"high"` | Reasoning depth |
| `mcpServers` | object | MCP server configuration |
| `notify` | string | Notification script path |
| `webSearchTool` | string | Custom search script path |
| `disabledSkills` | string[] | Skills to disable |
| `enabledSkills` | object | Per-skill enable toggles (all enabled by default) |

Models and keys are managed via `/model` and `/login`; manual editing is rarely needed. All fields: [configuration reference](docs/configuration_en.md).

## Commands & shortcuts

| Command | Description |
|---------|-------------|
| `/model` | Switch model, thinking mode, and effort |
| `/login` | Re-enter the login wizard |
| `/new` | Start a fresh session |
| `/resume` | Browse and resume previous sessions |
| `/continue` | Continue the active conversation or pick one |
| `/undo` | Restore code and/or conversation to a previous checkpoint |
| `/permissions` | View and change permission mode |
| `/init` | Generate an AGENTS.md project instructions file |
| `/skills` | List available skills |
| `/marketplace` | Browse and manage skill marketplaces |
| `/plugin` | Manage installed plugins |
| `/mcp` | Show MCP server status and tools |
| `/raw` | Toggle reasoning-content display mode |
| `/exit` | Quit |

| Action | Key |
|--------|-----|
| Send message | `Enter` |
| New line | `Shift+Enter` |
| Interrupt | `Esc` |
| Command menu | `/` |
| Quit | `Ctrl+D` ×2 |

## Development

```bash
npm install        # install dependencies and link workspaces
npm run check      # typecheck + lint + format check
npm run build      # core tsc → cli esbuild bundle
npm test           # 372 tests (core 190 + cli 182)
```

CI runs check, build, and test across a 9-job matrix: ubuntu / windows / macos × Node 20 / 22 / 24.

## Contributing

Issues and PRs are welcome — bug fixes, features, skill packages, documentation. Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

1. Fork and branch: `git checkout -b feat/my-feature`
2. Pass `npm run check` + `npm test`
3. Push and open a Pull Request

## License

[MIT](LICENSE) © CropCode Contributors

## Acknowledgments

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — the product benchmark for terminal AI agents
- [DeepCode CLI](https://github.com/nicepkg/deepcode-cli) — a key architectural reference for this project
- [Ink](https://github.com/vadimdemedes/ink) · [esbuild](https://esbuild.github.io/) · [OpenAI Node.js SDK](https://github.com/openai/openai-node) · [MCP](https://modelcontextprotocol.io/)
