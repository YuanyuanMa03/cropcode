# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CropCode is a terminal-based AI coding agent CLI for agricultural research, built with TypeScript, Ink (React for terminal UIs), and the OpenAI-compatible chat completions API. The published binary is `cropcode` (from `dist/cli.js`).

## Commands

```bash
npm run build          # typecheck + lint + format:check + esbuild bundle → dist/cli.js
npm test               # run all test files via src/tests/run-tests.mjs
npm run test:single -- src/tests/<name>.test.ts   # run one test file with tsx --test
npm run typecheck      # tsc --noEmit
npm run lint           # eslint src/
npm run lint:fix       # eslint --fix src/
npm run format         # prettier --write 'src/**/*.{ts,tsx}'
npm run format:check   # prettier --check
npm run check          # typecheck + lint + format:check (used by build)
```

Tests use Node's built-in `node:test` + `node:assert/strict`. The test runner at `src/tests/run-tests.mjs` discovers all `*.test.ts` files with glob and runs them as separate `tsx --test` subprocesses.

## Architecture

### Entry point and bundling

`src/cli.tsx` is the sole entry, bundled by esbuild to `dist/cli.js` as an ESM executable (Node 18+ target, `--jsx=automatic` with `react` import source). Dependencies are external (`--packages=external`).

### Settings resolution (`src/settings.ts`)

Multi-layer config with explicit priority:
1. `CROPCODE_*` environment variables (highest)
2. Project-level `.cropcode/settings.json`
3. User-level `~/.cropcode/settings.json`
4. Hardcoded defaults (lowest)

Key settings: `model`, `thinkingEnabled`, `reasoningEffort` (high/max), `debugLogEnabled`, `notify` (shell command), `webSearchTool`, `mcpServers`. The `resolveSettingsSources()` function walks all layers; MCP server configs are merged from user + project settings with env overlay.

### Session management (`src/session.ts`)

The core conversation loop. Each session is a persistent directory under `~/.cropcode/sessions/<project-name>/<session-id>/`. Manages:
- Full conversation history (`MAX_SESSION_ENTRIES = 50` messages before compaction)
- Streaming chat completions via OpenAI-compatible API with thinking/reasoning support
- Auto-compaction: when token usage exceeds thresholds (128K default, 512K for DeepSeek V4), it generates a conversation summary to reclaim context
- Tool call execution, including validating file-state for edit operations
- Git-aware file history via `GitFileHistory`
- Session resume/listing from the filesystem

### Prompt construction (`src/prompt.ts`)

- System prompt is Chinese-language, agriculture-domain focused
- Tool definitions assembled dynamically (bash, read, write, edit, AskUserQuestion, UpdatePlan, WebSearch + MCP external tools)
- Tool documentation loaded from `templates/tools/*.md` (or `*.md.ejs` rendered with model capabilities)
- Built-in skills loaded from `templates/skills/` (agent-drift-guard, plan-and-execute)
- Runtime context includes OS info, shell path, Python/Node versions, tool availability

### Tool execution (`src/tools/executor.ts`)

`ToolExecutor` class dispatches tool calls to registered handlers:
- `bash` — `src/tools/bash-handler.ts`: spawns shell with timeout, output capture, session-persistent working directory, process tree cleanup
- `read` — `src/tools/read-handler.ts`: reads files (text/images/PDFs/notebooks) with line-offset/limit support
- `write` — `src/tools/write-handler.ts`: full-file writes with encoding/line-ending preservation
- `edit` — `src/tools/edit-handler.ts`: string-based find-and-replace with snippet scoping
- `AskUserQuestion` — `src/tools/ask-user-question-handler.ts`
- `UpdatePlan` — `src/tools/update-plan-handler.ts`
- `WebSearch` — `src/tools/web-search-handler.ts`

Tool name aliases: `Bash→bash`, `Read→read`, `Write→write`, `Edit→edit` (case-insensitive matching from the API).

### MCP integration (`src/mcp/`)

`McpManager` manages multiple MCP server connections. Tool names are namespaced as `mcp__<serverName>__<toolName>`. Supports tool listing, prompt retrieval, and resource reading. Handles server reconnect on crash and `notifications/tools/list_changed` refresh. Timeout configurable via `CROPCODE_MCP_TIMEOUT` env var (default 30s startup, 60s tool calls).

### OpenAI client (`src/common/openai-client.ts`)

Singleton cached OpenAI client keyed by `apiKey::baseURL`. Uses a custom undici `Agent` with 180s keep-alive timeout. Fire-and-forget connection warmup on first creation.

### File state tracking (`src/common/state.ts`)

Per-session maps tracking read file content, versions, and snippets. The edit handler validates that the file hasn't changed since last read by comparing timestamps and content hashes. Snippets are scoped file views with version stamps.

### File utilities (`src/common/file-utils.ts`)

Encoding detection (UTF-8 vs UTF-16LE BOM), line-ending detection (LF vs CRLF), and a line-based diff preview builder for write/edit confirmation.

### UI layer (`src/ui/`)

Ink-based React components for the terminal UI:
- `App.tsx` / `AppContainer.tsx` — top-level app shell
- `PromptInput.tsx` — main input with slash-command, file-mention, and image-attachment support
- `MessageView/` — rendered chat messages with markdown and diff previews
- `ModelsDropdown/` — `/model` command with thinking mode options
- `SkillsDropdown/` — skill selection UI
- `SessionList.tsx` — session browser
- `WelcomeScreen.tsx` — first-run experience

### Template system

`templates/tools/` contains Markdown (or EJS) files that become tool documentation injected into the system prompt. `templates/prompts/` contains EJS prompt templates. `templates/skills/` holds built-in skill documents.

### Skill loading

Skills are loaded from multiple paths (priority low to high):
1. Legacy: `./.cropcode/skills/*/SKILL.md` (lowest)
2. User: `~/.agents/skills/*/SKILL.md`
3. Project: `./.agents/skills/*/SKILL.md` (highest)

Project-level skills override user-level skills with the same name.
