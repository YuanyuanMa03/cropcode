---
name: cropcode-self-refer
description: 回答关于 CropCode CLI 本身的问题——包括功能特性、配置项、斜杠命令、Skills、MCP 集成、权限、通知、会话持久化及故障排查。当用户询问如何配置或使用 CropCode、如何设置 MCP 服务器、管理权限、查看可用技能、理解斜杠命令、配置思考模式，或咨询 CropCode 相关使用场景时使用。
---

# CropCode Self-Refer

This Skill helps you answer user questions about CropCode CLI itself by consulting the reference documentation bundled with this Skill and the project docs. All docs live in the `references/` subdirectory or the project `docs/` directory — always refer to them for authoritative answers.

## When to use this Skill

Use this Skill when the user asks any question about CropCode itself, such as:

- "列出可用的 skills"
- "如何配置 MCP？"
- "怎么启用搜索功能？"
- "支持哪些模型？"
- "如何配置思考模式？"
- "怎么设置权限？"
- "支持哪些斜杠命令？"
- "会话历史保存在哪里？"
- Any other question about CropCode CLI's features, configuration, or usage.

## Instructions

### Step 1: Identify the topic

Map the user's question to the appropriate document(s):

| Topic | Document | Key contents |
|-------|----------|-------------|
| **Overview, features, quick start** | `references/README.md` | Installation, slash commands, keyboard shortcuts, supported models |
| **Configuration & settings** | `references/configuration.md` | `settings.json` fields, config hierarchy, env vars, thinking mode, reasoning effort, enabledSkills |
| **MCP setup & usage** | `references/mcp.md` | MCP server config format, examples, tool naming, troubleshooting |

### Step 2: Read the relevant document(s)

Use the `Read` tool to read the appropriate document(s). All paths are relative to this Skill's loaded root directory, where the `references/` subdirectory lives.

- If the question spans multiple topics, read multiple documents.
- When answering from references/README.md, focus on the relevant sections.

### Step 3: Answer with precision

- **Quote the doc directly** for config examples, JSON snippets, or command syntax.
- **Don't guess** — if the answer isn't in the docs, say so and suggest checking GitHub Issues.
- **Provide copy-paste-ready configurations** when the user asks to set something up.

### Best practices

1. **Always consult the docs first** — never answer from memory alone; the docs are the source of truth.
2. **Provide copy-paste-ready JSON** — users want to copy config blocks directly into their `settings.json`.
3. **Be specific about file paths** — always specify whether it's `~/.cropcode/settings.json` or `.cropcode/settings.json`.
4. **Mention `/mcp` verification** — after any MCP configuration change, remind users to use `/mcp` to verify.
