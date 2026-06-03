<div align="center">

<br/>

# 🌾 CropCode

**AI Coding Agent for Agricultural Research**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=22](https://img.shields.io/badge/Node.js-%3E%3D22-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/mayuanyuan/cropcode/pulls)

*An intelligent terminal coding assistant with deep thinking, tool use, and multi-turn reasoning — for data analysis, scripting, and scientific computing.*

[English](#english) · [中文](#中文)

</div>

---

<a id="english"></a>

## ✨ Highlights

- 🤖 **AI Agent** — Autonomous coding agent with deep thinking, tool use (bash, read, write, edit, web search), and multi-turn reasoning
- 🧠 **Deep Reasoning** — Configurable thinking mode and reasoning effort, supporting multiple LLM providers
- 🔐 **Multi-Provider Login** — Interactive TUI wizard to switch between DeepSeek, GLM, Qwen, and MiMo with one command
- 🌱 **Data Analysis** — Native Python (pandas/numpy/scipy/matplotlib) and R integration for data processing and statistical computing
- 📄 **Paper Tools** — LaTeX typesetting, reference management, and figure generation
- 🔌 **MCP Integration** — Connect external tools via Model Context Protocol (GitHub, browser, databases, and more)
- 🎯 **Skills System** — Extensible skill architecture for custom domain knowledge and workflows
- 💬 **Multi-Session** — Session management with undo, resume, and conversation compaction

## 📸 Screenshot

<div align="center">
  <img src="resources/intro.png" alt="CropCode Terminal Interface" width="700" />
</div>

## 🎬 Demo

<div align="center">
  <img src="resources/demo.gif" alt="CropCode Demo" width="700" />
</div>

## 🚀 Quick Start

### Install

```bash
git clone https://github.com/mayuanyuan/cropcode.git
cd cropcode
npm install
npm link
```

### Configure

CropCode provides an **interactive login wizard** on first launch. No manual config needed!

```bash
cropcode
```

You'll see:

```
 ╭──────────────────────────────────────────────────────────────────╮
 │  🌾 欢迎使用 CropCode！                                         │
 │   选择 AI 供应商开始使用（国内直连，无需代理）                     │
 ╰──────────────────────────────────────────────────────────────────╯

  选择供应商
 ────────────────────────────────────────────────────
 ▶ 🔥 DeepSeek            最便宜·代码最强·送500万tokens
   🧠 智谱 GLM             免费模型可用·Coding Plan·推理最强
   ☁️ 通义千问              阿里云生态·Coding Plan·90天免费
   📱 MiMo 小米             1M超长上下文·128K输出·Token Plan·开源

  ↑↓ 选择 · Enter 确认
```

#### Example 1 — MiMo Token Plan (Subscription)

```
  选择供应商:          📱 MiMo 小米 ✓
  接入方式:           编程套餐 (Token Plan) ✓
  选择模型:
 ────────────────────────────────────────────────────
 ▶ MiMo V2.5 Pro        ¥3/¥6   · 1M  [推荐, 旗舰]
   MiMo V2.5             ¥1/¥2   · 1M  [多模态]
   MiMo V2 Flash         ¥0.7/¥2.1 · 256K [轻量]

  ↑↓ 选择 · Enter 确认 · Esc 返回
```

```
  🔑 MiMo 小米 API Key
   获取方式：
   1. 访问 https://platform.xiaomimimo.com/token-plan
   2. 订阅后获取 tp-... 格式的专属密钥
   3. Key 格式: tp-...

  >_ tp-cmp1th4pwjpbh396c••••••••••••rj0t69▎
```

#### Example 2 — DeepSeek Pay-as-you-go (API)

```
  选择供应商:          🔥 DeepSeek ✓
  选择模型:
 ────────────────────────────────────────────────────
 ▶ DeepSeek V4 Pro      ¥3/¥6   · 1M  [推荐, 代码最强]
   DeepSeek V4 Flash     ¥1/¥2   · 1M  [轻量快速]

  ↑↓ 选择 · Enter 确认
```

```
  🔑 DeepSeek API Key
   获取方式：
   1. 访问 https://platform.deepseek.com/api_keys
   2. 注册送500万tokens（30天有效），充值¥10起
   3. Key 格式: sk-...

  >_ sk-a1b2c3d4e5f6g7h8••••••••••••x9y0z▎
```

#### Switch Provider Anytime

```
> /login            ← Re-enter the login wizard
> /model            ← Switch model within current provider
```

<details>
<summary><b>Manual configuration (advanced)</b></summary>

If you prefer editing config files directly:

```json
// ~/.cropcode/settings.json
{
  "env": {
    "MODEL": "deepseek-v4-pro",
    "BASE_URL": "https://api.deepseek.com",
    "API_KEY": "sk-your-api-key"
  },
  "thinkingEnabled": true,
  "reasoningEffort": "max"
}
```

</details>

### Run

```bash
cd your-project
cropcode
```

## 🌿 Core Features

### Data Analysis

CropCode handles data analysis natively with Python and R integration.

```
> 分析这个CSV数据，做统计摘要并绘制分布图
```

- Data cleaning, transformation, and visualization
- Python (pandas/numpy/scipy/matplotlib) + R
- Statistical modeling, regression, ANOVA

### Paper & Writing Tools

```
> 把这个结果整理成 LaTeX 表格
```

- LaTeX typesetting and reference management
- Figure and chart generation
- Data visualization for publications

### Agent Capabilities

```
> 读取 data/results.csv，清洗异常值，做统计分析，把结果写成 markdown 报告
```

CropCode operates as a fully autonomous agent:
1. Reads your files
2. Executes analysis code (Python/R/Shell)
3. Writes results and reports
4. Handles errors and retries automatically

### Skills & Plugin Marketplace

CropCode's skill system is fully extensible. You have multiple ways to find and install skills:

**Quick Start — Install from a community marketplace:**

```bash
# Register a marketplace (e.g. nature-skills)
cropcode marketplace add https://github.com/Yuan1z0825/nature-skills.git

# Browse available skills
cropcode marketplace list

# Install a skill
cropcode plugin install <skill-name>@nature-skills
```

**Other ways to get skills:**

| Method | How |
|--------|-----|
| Community marketplaces | `cropcode marketplace add <github-url>` — browse and install curated skill collections |
| Write your own | Create `~/.agents/skills/my-skill/SKILL.md` — no installation needed |
| Per-project skills | Place in `<project>/.agents/skills/` — available only in that project |
| Local directory | `cropcode marketplace add /path/to/skills` — use a local folder as marketplace |
| Git clone | Clone any skill repo and register it as a local marketplace |

Type `/` in the prompt to see all available skills, or `/marketplace` to manage marketplaces.

> **Full documentation:** [docs/plugins-skills-marketplace_en.md](docs/plugins-skills-marketplace_en.md) — includes how to create your own marketplace, write custom skills, and share with your team.

### MCP Integration

Connect external services via Model Context Protocol:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}
```

See [docs/mcp_en.md](docs/mcp_en.md) for detailed setup.

## ⌨️ Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Send message | `Enter` |
| New line | `Shift+Enter` |
| Interrupt generation | `Esc` |
| Command menu | `/` |
| Switch model | `/model` |
| List skills | `/skills` |
| Marketplace | `/marketplace` |
| Installed plugins | `/plugin` |
| New session | `/new` |
| Resume session | `/resume` |
| Undo | `/undo` |
| MCP status | `/mcp` |
| Exit | `/exit` or `Ctrl+D` ×2 |

## ⚙️ Configuration

### Configuration Hierarchy

Settings are resolved with the following priority (higher overrides lower):

1. **Defaults** — Hardcoded defaults
2. **User settings** — `~/.cropcode/settings.json`
3. **Project settings** — `<project>/.cropcode/settings.json`
4. **Environment variables** — `CROPCODE_*` prefixed env vars

### All Settings

| Field | Type | Description |
|-------|------|-------------|
| `env.MODEL` | string | Model name (e.g. `deepseek-v4-pro`, `gpt-4o`) |
| `env.BASE_URL` | string | API base URL |
| `env.API_KEY` | string | API key |
| `thinkingEnabled` | boolean | Enable thinking mode (default: `true` for DeepSeek V4) |
| `reasoningEffort` | string | `"max"` or `"high"` (default: `"max"`) |
| `notify` | string | Path to notification script |
| `webSearchTool` | string | Path to custom web search script |
| `mcpServers` | object | MCP server configurations |
| `disabledSkills` | string[] | Skills to disable |

For detailed configuration, see [docs/configuration_en.md](docs/configuration_en.md).

### Supported Providers

All providers are OpenAI-compatible — CropCode handles the protocol differences automatically.

| Provider | Thinking Format | Token Plan | Free Tier | Models |
|----------|----------------|------------|-----------|--------|
| 🔥 DeepSeek | `thinking:{type:"enabled"}` + `reasoning_effort` | — | 5M tokens on signup | V4 Pro, V4 Flash |
| 🧠 GLM (Zhipu) | Same as DeepSeek | 3 tiers (Lite/Pro/Max) | GLM-4.7 Flash free | GLM-5.1, 4.7, 4.6, 4.7 Flash |
| ☁️ Qwen (Alibaba) | `enable_thinking:true` + `thinking_budget` | 1 tier (Pro) | 90-day free quota | Qwen3 Max, 3.5 Plus, 3.5 Flash |
| 📱 MiMo (Xiaomi) | Same as DeepSeek (no `reasoning_effort`) | 4 tiers (Lite~Max) | New user credits | V2.5 Pro, V2.5, V2 Flash |

## 🛠️ Architecture

```
┌─────────────────────────────────────────┐
│              Terminal UI (Ink/React)     │
│   ┌─────────────────────────────────┐   │
│   │  Login Wizard (/login)          │   │
│   │  Provider → Mode → Model → Key  │   │
│   └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│           Session Manager                │
│  ┌────────────┐  ┌──────────────────┐   │
│  │ LLM Client │  │  Tool Executor   │   │
│  │ (OpenAI)   │  │  ┌────┐ ┌─────┐  │   │
│  │            │  │  │Bash│ │Read │  │   │
│  │ DeepSeek   │  │  ├────┤ ├─────┤  │   │
│  │ GLM (智谱) │  │  │Write│ │Edit │  │   │
│  │ Qwen (通义)│  │  ├────┤ ├─────┤  │   │
│  │ MiMo (小米)│  │  │WebSearch│Ask │  │   │
│  └────────────┘  │  └─────────┴────┘  │   │
│                  │  ┌──────────────┐   │   │
│                  │  │  MCP Manager │   │   │
│                  │  └──────────────┘   │   │
│                  └──────────────────┘   │
├─────────────────────────────────────────┤
│          Skills & Prompts               │
│   ~/.agents/skills/*/SKILL.md           │
│   ./.agents/skills/*/SKILL.md           │
└─────────────────────────────────────────┘
```

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, skills, or documentation improvements.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## 📄 License

[MIT](LICENSE) © CropCode Contributors

---

<a id="中文"></a>

<div align="center">

# 🌾 CropCode

**专为农业科研设计的 AI 编程助手**

*具备深度思考、工具调用和多轮推理能力的智能终端编程助手，适用于数据分析、脚本编写和科学计算。*

</div>

## ✨ 核心特性

- 🤖 **自主 Agent** — 具备深度思考、工具调用（bash/read/write/edit/web search）和多轮推理能力的自主编程助手
- 🧠 **深度推理** — 可配置思考模式和推理强度，支持多家 LLM 供应商
- 🔐 **多供应商登录** — 交互式 TUI 向导，一条命令切换 DeepSeek、智谱、通义千问、MiMo
- 🌱 **数据分析** — 原生 Python (pandas/numpy/scipy/matplotlib) 和 R 集成，支持数据处理和统计计算
- 📄 **论文工具** — LaTeX 排版、参考文献管理、图表生成
- 🔌 **MCP 集成** — 通过 Model Context Protocol 连接外部工具（GitHub、浏览器、数据库等）
- 🎯 **技能系统** — 可扩展的技能架构，支持自定义领域知识和工作流
- 💬 **多会话管理** — 支持撤销、恢复和对话压缩

## 🚀 快速开始

### 安装

```bash
git clone https://github.com/mayuanyuan/cropcode.git
cd cropcode
npm install
npm link
```

### 配置

CropCode **首次启动时自动弹出交互式登录向导**，无需手动编辑配置！

```bash
cropcode
```

你会看到：

```
 ╭──────────────────────────────────────────────────────────────────╮
 │  🌾 欢迎使用 CropCode！                                         │
 │   选择 AI 供应商开始使用（国内直连，无需代理）                     │
 ╰──────────────────────────────────────────────────────────────────╯

  选择供应商
 ────────────────────────────────────────────────────
 ▶ 🔥 DeepSeek            最便宜·代码最强·送500万tokens
   🧠 智谱 GLM             免费模型可用·Coding Plan·推理最强
   ☁️ 通义千问              阿里云生态·Coding Plan·90天免费
   📱 MiMo 小米             1M超长上下文·128K输出·Token Plan·开源

  ↑↓ 选择 · Enter 确认
```

#### 示例 1 — MiMo Token Plan（订阅套餐）

```
  选择供应商:          📱 MiMo 小米 ✓
  接入方式:           编程套餐 (Token Plan) ✓
  选择模型:
 ────────────────────────────────────────────────────
 ▶ MiMo V2.5 Pro        ¥3/¥6   · 1M  [推荐, 旗舰]
   MiMo V2.5             ¥1/¥2   · 1M  [多模态]
   MiMo V2 Flash         ¥0.7/¥2.1 · 256K [轻量]

  ↑↓ 选择 · Enter 确认 · Esc 返回
```

```
  🔑 MiMo 小米 API Key
   获取方式：
   1. 访问 https://platform.xiaomimimo.com/token-plan
   2. 订阅后获取 tp-... 格式的专属密钥
   3. Key 格式: tp-...

  >_ tp-cmp1th4pwjpbh396c••••••••••••rj0t69▎
```

#### 示例 2 — DeepSeek 按量计费（API Key）

```
  选择供应商:          🔥 DeepSeek ✓
  选择模型:
 ────────────────────────────────────────────────────
 ▶ DeepSeek V4 Pro      ¥3/¥6   · 1M  [推荐, 代码最强]
   DeepSeek V4 Flash     ¥1/¥2   · 1M  [轻量快速]

  ↑↓ 选择 · Enter 确认
```

```
  🔑 DeepSeek API Key
   获取方式：
   1. 访问 https://platform.deepseek.com/api_keys
   2. 注册送500万tokens（30天有效），充值¥10起
   3. Key 格式: sk-...

  >_ sk-a1b2c3d4e5f6g7h8••••••••••••x9y0z▎
```

#### 随时切换供应商

```
> /login            ← 重新进入登录向导
> /model            ← 在当前供应商内切换模型
```

<details>
<summary><b>手动配置（高级）</b></summary>

如果你更习惯直接编辑配置文件：

```json
// ~/.cropcode/settings.json
{
  "env": {
    "MODEL": "deepseek-v4-pro",
    "BASE_URL": "https://api.deepseek.com",
    "API_KEY": "sk-你的API密钥"
  },
  "thinkingEnabled": true,
  "reasoningEffort": "max"
}
```

</details>

### 运行

```bash
cd your-project
cropcode
```

## 🌿 功能详解

### 数据分析

CropCode 原生支持数据清洗、统计分析和可视化。

```
> 分析这个CSV数据，做统计摘要并绘制分布图
```

### 论文写作工具

```
> 把这个结果整理成 LaTeX 表格
```

### 技能与插件市场

CropCode 的技能系统完全可扩展，你可以自由选择获取和管理技能的方式：

**快速开始 — 从社区市场安装：**

```bash
# 注册一个市场（例如 nature-skills）
cropcode marketplace add https://github.com/Yuan1z0825/nature-skills.git

# 浏览可用技能
cropcode marketplace list

# 安装技能
cropcode plugin install <技能名>@nature-skills
```

**其他获取技能的方式：**

| 方式 | 操作 |
|------|------|
| 社区市场 | `cropcode marketplace add <github地址>` — 浏览并安装精选技能集合 |
| 自己编写 | 在 `~/.agents/skills/我的技能/SKILL.md` 创建即可，无需安装 |
| 项目级技能 | 放在 `<项目>/.agents/skills/` 下，仅当前项目可用 |
| 本地目录 | `cropcode marketplace add /路径/技能目录` — 用本地文件夹作为市场 |
| Git 克隆 | 克隆任意技能仓库，注册为本地市场即可使用 |

在提示符中输入 `/` 查看所有可用技能，或输入 `/marketplace` 管理市场。

> **完整文档：** [docs/plugins-skills-marketplace.md](docs/plugins-skills-marketplace.md) — 包含如何创建自己的市场、编写自定义技能、以及与团队共享。[English](docs/plugins-skills-marketplace_en.md)

### MCP 集成

通过 Model Context Protocol 连接 GitHub 等外部服务：

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}
```

详见 [docs/mcp.md](docs/mcp.md)。

## ⌨️ 快捷键

| 操作 | 按键 |
|------|------|
| 发送消息 | `Enter` |
| 换行 | `Shift+Enter` |
| 中断生成 | `Esc` |
| 命令菜单 | `/` |
| 切换模型 | `/model` |
| 查看技能 | `/skills` |
| 插件市场 | `/marketplace` |
| 已装插件 | `/plugin` |
| 新会话 | `/new` |
| 恢复会话 | `/resume` |
| 撤销 | `/undo` |
| MCP 状态 | `/mcp` |
| 退出 | `/exit` 或 `Ctrl+D` ×2 |

## ⚙️ 配置

### 配置层级

设置按以下优先级解析（高优先级覆盖低优先级）：

1. **默认值** — 程序内置
2. **用户配置** — `~/.cropcode/settings.json`
3. **项目配置** — `<项目>/.cropcode/settings.json`
4. **环境变量** — `CROPCODE_*` 前缀的环境变量

详细配置说明请参阅 [docs/configuration.md](docs/configuration.md)。

## 🛠️ 致谢

本项目开发过程中参考和使用了以下开源技术：

- [DeepSeek](https://platform.deepseek.com) — LLM 模型服务
- [智谱 GLM](https://open.bigmodel.cn) — LLM 模型服务
- [通义千问](https://bailian.console.aliyun.com) — LLM 模型服务
- [MiMo 小米](https://platform.xiaomimimo.com) — LLM 模型服务
- [OpenAI Node.js SDK](https://github.com/openai/openai-node) — LLM API 调用
- [Ink](https://github.com/vadimdemedes/ink) — 终端 React 渲染引擎
- [MCP](https://modelcontextprotocol.io/) — AI 工具集成协议
- [esbuild](https://esbuild.github.io/) — JavaScript 构建工具
- [React](https://react.dev/) — UI 框架

## 📄 许可证

[MIT](LICENSE) © CropCode Contributors
