<div align="center">

<img src="resources/intro.png" alt="CropCode Terminal" width="700" />

# 🌾 CropCode

**AI Coding Agent — 为农业研究者打造，但能力远不止于此**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=18](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![CI](https://github.com/YuanyuanMa03/cropcode/actions/workflows/ci.yml/badge.svg)](https://github.com/YuanyuanMa03/cropcode/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/YuanyuanMa03/cropcode/pulls)

*深度思考 · 工具调用 · 多轮推理 · 多供应商 · 开源可扩展*

[English](#english) · [中文](#中文) · [架构文档](docs/architecture.md)

</div>

---

<a id="english"></a>

## Why CropCode?

CropCode is an **AI-powered coding agent** that runs in your terminal. Think Claude Code, but open-source, multi-provider, and with a community skill marketplace.

### vs Other Agents

| Capability | Claude Code | Codex | Cursor | **CropCode** |
|------------|:---:|:---:|:---:|:---:|
| **Multi-provider** | ❌ Anthropic only | ❌ OpenAI only | ❌ | **✅ 4 providers** |
| **Built-in Login** | OAuth | Manual | OAuth | **✅ TUI wizard** |
| **Skill Marketplace** | ❌ | ❌ | Extensions | **✅ Community** |
| **Thinking Modes** | Extended | ❌ | ❌ | **✅ dual-format** |
| **China Direct** | Proxy | Proxy | Partial | **✅ no proxy** |
| **Paper Tools** | ❌ | ❌ | ❌ | **✅ LaTeX/citations** |
| **Open Source** | ❌ | ❌ | ❌ | **✅ MIT** |

[Full comparison →](docs/why-cropcode.md)

### Killer Features

- 🔐 **TUI Login Wizard** — pick provider, model, enter key. No config files, no proxy setup
- 🧩 **Skill Marketplace** — first community marketplace for AI agent skills. One command to install
- 🧠 **Dual Thinking Format** — auto-adapts deepseek/qwen thinking protocols per provider
- 📊 **Python/R Native** — data analysis, scientific computing, LaTeX — all built-in

## ✨ Key Features

- **Multi-Provider** — DeepSeek, Zhipu GLM, Qwen, Xiaomi MiMo. One-click TUI login to switch
- **Skill Marketplace** — Community-driven skill ecosystem. Install code-review, testing, paper-writing skills from marketplaces
- **Deep Reasoning** — Configurable thinking mode, per-provider format adaptation (deepseek / qwen protocols)
- **Autonomous Agent** — Deep thinking + tool use + multi-turn reasoning, handles complex multi-step tasks
- **Tool System** — Bash, Read, Write, Edit, WebSearch, AskUserQuestion, UpdatePlan — extensible via MCP
- **Data Analysis** — Native Python (pandas/numpy/scipy/matplotlib) and R integration
- **Paper Tools** — LaTeX typesetting, reference management, figure generation
- **MCP Integration** — Connect external tools via Model Context Protocol
- **Session Management** — Multi-session with undo, resume, and automatic context compaction

## 🎬 Demo

<div align="center">
  <img src="resources/demo.gif" alt="CropCode Demo" width="700" />
</div>

## 🚀 Quick Start

### Prerequisites
- **Node.js >= 18**
- Python 3 (optional, for data analysis) or R (optional, for statistics)

### Install

```bash
git clone https://github.com/YuanyuanMa03/cropcode.git
cd cropcode
npm install
npm link
```

### Configure

On first launch, CropCode shows an **interactive TUI login wizard** — no manual config needed.

```bash
cropcode
```

```
 ╭──────────────────────────────────────────────────────────────────╮
 │  🌾 欢迎使用 CropCode！                                          │
 │   选择 AI 供应商开始使用（国内直连，无需代理）                      │
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
 ▶ MiMo V2.5 Pro       ¥3/¥6  · 1M    [推荐, 旗舰]
   MiMo V2.5            ¥1/¥2  · 1M    [多模态]
   MiMo V2 Flash        ¥0.7/¥2.1 · 256K [轻量]

  🔑 API Key (tp-... 格式):
  >_ tp-cmp1th4pwjpbh396c••••••••••••rj0t69▎
```

#### Example 2 — DeepSeek Pay-as-you-go

```
  选择供应商:          🔥 DeepSeek ✓
  选择模型:
 ────────────────────────────────────────────────────
 ▶ DeepSeek V4 Pro     ¥3/¥6  · 1M    [推荐, 代码最强]
   DeepSeek V4 Flash    ¥1/¥2  · 1M    [轻量快速]

  🔑 API Key (sk-... 格式):
  >_ sk-a1b2c3d4e5f6g7h8••••••••••••x9y0z▎
```

#### Switch Anytime

```
> /login            ← Re-enter the login wizard
> /model            ← Switch model within current provider
```

<details>
<summary><b>Manual configuration (advanced)</b></summary>

```json
// ~/.cropcode/settings.json
{
  "thinkingEnabled": true,
  "reasoningEffort": "max"
}
```

Model/provider/key are managed through the TUI wizard or `/model` command — no manual config needed.

</details>

### Run

```bash
cd your-project
cropcode
```

## 📖 Usage Examples

### Write & Debug Code
```
> Write a Python script to fetch weather data from the NASA POWER API for Nanjing in 2023
```

CropCode reads files, writes code, executes it, and fixes errors automatically.

### Data Analysis
```
> 分析 data/results.csv，清洗异常值，做统计摘要，把结果写成 markdown 报告
```

Native Python (pandas/scipy/matplotlib) and R integration — data cleaning, statistical modeling, visualization.

### Research Writing
```
> 把这些回归分析结果整理成 LaTeX 表格，并生成论文格式的图表
```

LaTeX table generation, figure formatting for publications.

### Multi-step Agent
```
> Read all TypeScript files in src/, find functions without type annotations, add proper types, and run the test suite
```

CropCode operates autonomously: reads codebase → identifies issues → edits files → runs tests → reports results.

## 📋 Commands

| Command | Description |
|---------|-------------|
| `/model` | Switch model and configure thinking mode |
| `/login` | Re-enter the multi-provider login wizard |
| `/new` | Start a fresh session |
| `/resume` | Browse and resume previous sessions |
| `/undo` | Undo tool actions |
| `/skills` | List available skills |
| `/marketplace` | Manage plugin marketplaces (add, list, remove) |
| `/plugin` | View installed plugins |
| `/mcp` | View MCP server status |
| `/raw` | Toggle raw output mode |
| `/exit` | Exit CropCode |

## ⌨️ Shortcuts

| Action | Key |
|--------|-----|
| Send message | `Enter` |
| New line | `Shift+Enter` |
| Interrupt | `Esc` |
| Command menu | `/` |
| Exit | `Ctrl+D` ×2 |

## 📦 Supported Providers

All providers are OpenAI-compatible. CropCode handles protocol differences (thinking format, reasoning effort, multimodal support) automatically.

| Provider | Models | Thinking | Pricing | Trial |
|----------|--------|:---:|------|------|
| 🔥 **DeepSeek** | V4 Pro, V4 Flash | deepseek format + reasoning_effort | ¥1–6/M tokens | 5M tokens free |
| 🧠 **GLM (Zhipu)** | GLM-5.1, 4.7, 4.6, 4.7 Flash | deepseek format + reasoning_effort | ¥1–10/M tokens | Free tier available |
| ☁️ **Qwen (Alibaba)** | Qwen3 Max, 3.5 Plus, 3.5 Flash | qwen format (thinking_budget) | ¥2–12/M tokens | 90 days free quota |
| 📱 **MiMo (Xiaomi)** | V2.5 Pro, V2.5, V2 Flash | deepseek format (no reasoning_effort) | ¥0.7–6/M tokens | New user credits |

| Provider | Subscription Plan | Tiers |
|----------|-------------------|-------|
| GLM | Coding Plan | Lite / Pro / Max |
| Qwen | Coding Plan | Pro |
| MiMo | Token Plan | Lite (¥39/mo) / Standard (¥99/mo) / Pro (¥329/mo) / Max (¥659/mo) |

## 🔌 MCP Integration

Connect external services via Model Context Protocol:

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

See [docs/mcp_en.md](docs/mcp_en.md) for detailed setup.

## 🧩 Skills & Marketplace

Extend CropCode with custom skills. Multiple ways to get them:

```bash
# Register a community marketplace
cropcode marketplace add https://github.com/Yuan1z0825/nature-skills.git

# Browse & install
cropcode marketplace list
cropcode plugin install <skill-name>@nature-skills
```

| Method | How |
|--------|-----|
| Community marketplace | `marketplace add <url>` — browse and install curated collections |
| Write your own | Create `~/.agents/skills/my-skill/SKILL.md` |
| Per-project | Place in `<project>/.agents/skills/` |
| Local directory | `marketplace add /path/to/skills` |

See [docs/plugins-skills-marketplace_en.md](docs/plugins-skills-marketplace_en.md) for full documentation.

## ⚙️ Configuration

### Hierarchy (higher overrides lower)

1. **Hard Override** — `credentials.json` (set via login wizard, always wins when active)
2. **Environment** — `CROPCODE_*` prefixed variables
3. **Project** — `<project>/.cropcode/settings.json`
4. **User** — `~/.cropcode/settings.json`
5. **Defaults** — Built-in presets

### Available Settings

| Field | Type | Description |
|-------|------|-------------|
| `thinkingEnabled` | boolean | Enable deep reasoning (default: auto from model preset) |
| `reasoningEffort` | `"max"` \| `"high"` | Reasoning depth (default: `"max"`) |
| `model` | string | Model ID (managed via `/model` command) |
| `notify` | string | Path to notification script |
| `webSearchTool` | string | Path to custom web search script |
| `mcpServers` | object | MCP server configurations |
| `disabledSkills` | string[] | Skills to disable |

See [docs/configuration_en.md](docs/configuration_en.md) for full details.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│           Terminal UI (Ink/React)             │
│  LoginScreen  WelcomeScreen  PromptInput      │
├──────────────────────────────────────────────┤
│           Session Manager                     │
│  ┌──────────┐  ┌──────────────────────────┐  │
│  │ LLM Client│  │     Tool Executor        │  │
│  │ (OpenAI)  │  │  Bash Read Write Edit    │  │
│  │           │  │  WebSearch MCP           │  │
│  │ DeepSeek  │  └──────────────────────────┘  │
│  │ GLM Qwen  │                                │
│  │ MiMo      │  ┌──────────────────────────┐  │
│  └──────────┘  │     MCP Manager           │  │
│                └──────────────────────────┘  │
├──────────────────────────────────────────────┤
│        Skills · Marketplace · Plugins         │
│   ~/.agents/skills/  ./.agents/skills/       │
└──────────────────────────────────────────────┘
```

Read the full [Architecture Document](docs/architecture.md) for data flow diagrams, model resolution, session lifecycle, and design decisions.

**Interactive diagram:** [docs/architecture-diagram.drawio](docs/architecture-diagram.drawio) — open with [draw.io](https://app.diagrams.net/) for a layered view with drill-down detail.

## 🧪 Development

```bash
npm install
npm run check      # TypeCheck + Lint + Format
npm run bundle     # esbuild → dist/cli.js
npm test           # 335 tests
```

See [CLAUDE.md](CLAUDE.md) for project conventions and development guide.

## 🤝 Contributing

Contributions are welcome! Bug fixes, features, skills, documentation — all appreciated.

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/my-feature`
3. Commit your changes (follow [Conventional Commits](https://www.conventionalcommits.org/))
4. Push and open a Pull Request

PRs run CI across 3 OS × 3 Node versions (18 jobs) — all must pass.

## 📄 License

[MIT](LICENSE) © CropCode Contributors

## 🙏 Acknowledgments

CropCode is built on and inspired by excellent open-source projects:

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — the gold standard for terminal AI agents
- [DeepSeek](https://platform.deepseek.com) · [Zhipu GLM](https://open.bigmodel.cn) · [Qwen](https://bailian.console.aliyun.com) · [MiMo](https://platform.xiaomimimo.com) — LLM providers
- [Ink](https://github.com/vadimdemedes/ink) — React for terminal UIs
- [OpenAI Node.js SDK](https://github.com/openai/openai-node) — LLM API client
- [MCP](https://modelcontextprotocol.io/) — AI tool integration protocol
- [esbuild](https://esbuild.github.io/) — fast JavaScript bundler

---

<a id="中文"></a>

<div align="center">

# 🌾 CropCode

**AI Coding Agent — 为农业研究者打造，但能力远不止于此**

</div>

## 为什么选择 CropCode？

CropCode 是一个运行在终端中的 **AI 编程助手**。对标 Claude Code，但**开源**、**多供应商**、有**社区技能市场**。

### 与其他 Agent 对比

| 能力 | Claude Code | Codex | Cursor | **CropCode** |
|------|:---:|:---:|:---:|:---:|
| **多供应商** | ❌ 仅 Anthropic | ❌ 仅 OpenAI | ❌ | **✅ 4 家国产** |
| **内置登录** | OAuth | 手动 | OAuth | **✅ TUI 向导** |
| **技能市场** | ❌ | ❌ | 扩展 | **✅ 社区市场** |
| **思考模式** | Extended | ❌ | ❌ | **✅ 双格式适配** |
| **国内直连** | 需代理 | 需代理 | 部分 | **✅ 全部直连** |
| **论文工具** | ❌ | ❌ | ❌ | **✅ LaTeX/引用** |
| **开源** | ❌ | ❌ | ❌ | **✅ MIT** |

[完整对比 →](docs/why-cropcode.md)

### 杀手级特性

- 🔐 **TUI 登录向导** — 选供应商 → 选模型 → 输入 Key，三步完成，无需手动编辑配置
- 🧩 **技能市场** — 首个 AI Agent 社区技能市场，一键安装代码审查、测试、论文写作等技能
- 🧠 **双格式深度推理** — 自动适配 deepseek/qwen 两种 thinking 协议，每个供应商精确优化
- 📊 **Python/R 原生集成** — 数据分析、科学计算、LaTeX 排版开箱即用

## ✨ 核心特性

- **多供应商** — DeepSeek、智谱 GLM、通义千问、小米 MiMo，一套工具自由切换
- **技能市场** — 社区驱动的技能生态，安装代码审查/测试生成/论文写作等社区技能
- **深度推理** — 可配置思考模式，自动适配 deepseek/qwen 双协议格式
- **自主 Agent** — 深度思考 + 工具调用 + 多轮推理，全自主完成复杂任务
- **工具系统** — Bash、Read、Write、Edit、WebSearch、AskUserQuestion、UpdatePlan，MCP 可扩展
- **数据分析** — 原生 Python (pandas/numpy/scipy/matplotlib) 和 R 集成
- **论文工具** — LaTeX 排版、参考文献管理、论文图表生成
- **MCP 集成** — Model Context Protocol 连接外部工具
- **会话管理** — 多会话支持，可撤销、恢复、自动上下文压缩

## 🚀 快速开始

### 环境要求
- **Node.js >= 18**
- Python 3（可选，数据分析）或 R（可选，统计计算）

### 安装

```bash
git clone https://github.com/YuanyuanMa03/cropcode.git
cd cropcode
npm install
npm link
```

### 配置

首次启动自动弹出 **TUI 交互式登录向导**，无需手动编辑配置。

```bash
cropcode
```

```
 ╭──────────────────────────────────────────────────────────────────╮
 │  🌾 欢迎使用 CropCode！                                          │
 │   选择 AI 供应商开始使用（国内直连，无需代理）                      │
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
 ▶ MiMo V2.5 Pro       ¥3/¥6  · 1M    [推荐, 旗舰]
   MiMo V2.5            ¥1/¥2  · 1M    [多模态]
   MiMo V2 Flash        ¥0.7/¥2.1 · 256K [轻量]

  🔑 请输入 API Key（tp-... 格式）：
  >_ tp-cmp1th4pwjpbh396c••••••••••••rj0t69▎
```

#### 示例 2 — DeepSeek 按量计费

```
  选择供应商:          🔥 DeepSeek ✓
  选择模型:
 ────────────────────────────────────────────────────
 ▶ DeepSeek V4 Pro     ¥3/¥6  · 1M    [推荐, 代码最强]
   DeepSeek V4 Flash    ¥1/¥2  · 1M    [轻量快速]

  🔑 请输入 API Key（sk-... 格式）：
  >_ sk-a1b2c3d4e5f6g7h8••••••••••••x9y0z▎
```

#### 随时切换

```
> /login            ← 重新进入登录向导
> /model            ← 在当前供应商内切换模型和思考模式
```

<details>
<summary><b>手动配置（高级用户）</b></summary>

```json
// ~/.cropcode/settings.json
{
  "thinkingEnabled": true,
  "reasoningEffort": "max"
}
```

模型/供应商/密钥通过 TUI 向导或 `/model` 命令管理，一般不需要手动编辑配置。

</details>

### 运行

```bash
cd your-project
cropcode
```

## 📖 使用示例

### 编写和调试代码
```
> 用 Python 写一个脚本，从 NASA POWER API 获取南京 2023 年的气象数据
```

CropCode 会读取文件、编写代码、执行、并自动修复错误。

### 数据分析
```
> 分析 data/results.csv，清洗异常值，做统计摘要，把结果写成 markdown 报告
```

原生 Python/R 集成 — 数据清洗、统计建模、可视化。

### 论文写作
```
> 把这些回归分析结果整理成 LaTeX 表格，用 matplotlib 生成论文格式的图表
```

LaTeX 表格生成、出版物级别的图表排版。

### 多步骤自主任务
```
> 读取 src/ 下所有 TypeScript 文件，找出没有类型注解的函数，补充类型，运行测试套件
```

全自主操作：读取代码 → 定位问题 → 编辑文件 → 运行测试 → 报告结果。

## 📋 命令

| 命令 | 说明 |
|------|------|
| `/model` | 切换模型和配置思考模式 |
| `/login` | 重新进入多供应商登录向导 |
| `/new` | 开始新会话 |
| `/resume` | 浏览和恢复历史会话 |
| `/undo` | 撤销工具操作 |
| `/skills` | 查看可用技能 |
| `/marketplace` | 管理插件市场（添加、列表、删除） |
| `/plugin` | 查看已安装插件 |
| `/mcp` | 查看 MCP 服务器状态 |
| `/raw` | 切换原始输出模式 |
| `/exit` | 退出 |

## ⌨️ 快捷键

| 操作 | 快捷键 |
|------|--------|
| 发送消息 | `Enter` |
| 换行 | `Shift+Enter` |
| 中断生成 | `Esc` |
| 命令菜单 | `/` |
| 退出 | `Ctrl+D` ×2 |

## 📦 供应商支持

所有供应商均为 OpenAI 兼容 API。CropCode 自动处理协议差异（thinking 格式、reasoning effort、multimodal 支持）。

| 供应商 | 模型 | Thinking | 价格 | 试用 |
|--------|------|:---:|------|------|
| 🔥 **DeepSeek** | V4 Pro, V4 Flash | deepseek 格式 + reasoning_effort | ¥1–6/M tokens | 注册送500万 |
| 🧠 **智谱 GLM** | GLM-5.1, 4.7, 4.6, 4.7 Flash | deepseek 格式 + reasoning_effort | ¥1–10/M tokens | 免费模型可用 |
| ☁️ **通义千问** | Qwen3 Max, 3.5 Plus, 3.5 Flash | qwen 格式 (thinking_budget) | ¥2–12/M tokens | 90天免费额度 |
| 📱 **小米 MiMo** | V2.5 Pro, V2.5, V2 Flash | deepseek 格式 (无 reasoning_effort) | ¥0.7–6/M tokens | 新用户赠送 |

| 供应商 | 套餐方案 | 档位 |
|--------|----------|------|
| GLM | Coding Plan | Lite / Pro / Max |
| Qwen | Coding Plan | Pro |
| MiMo | Token Plan | Lite (¥39/月) / Standard (¥99/月) / Pro (¥329/月) / Max (¥659/月) |

## 🔌 MCP 集成

通过 Model Context Protocol 连接外部服务：

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

详见 [docs/mcp.md](docs/mcp.md)。

## 🧩 技能与插件市场

多种方式扩展 CropCode：

```bash
# 注册社区市场
cropcode marketplace add https://github.com/Yuan1z0825/nature-skills.git

# 浏览和安装
cropcode marketplace list
cropcode plugin install <技能名>@nature-skills
```

| 方式 | 操作 |
|------|------|
| 社区市场 | `marketplace add <url>` — 浏览安装精选技能集 |
| 自己编写 | 在 `~/.agents/skills/我的技能/SKILL.md` 创建 |
| 项目级 | 放在 `<项目>/.agents/skills/` 下 |
| 本地目录 | `marketplace add /路径/技能目录` |

详见 [docs/plugins-skills-marketplace.md](docs/plugins-skills-marketplace.md)。

## ⚙️ 配置

### 优先级（高覆盖低）

1. **凭证覆盖** — `credentials.json`（登录向导设置，有凭证时永远最高优先）
2. **环境变量** — `CROPCODE_*` 前缀
3. **项目配置** — `<project>/.cropcode/settings.json`
4. **用户配置** — `~/.cropcode/settings.json`
5. **系统默认** — 内置预设

### 可用设置

| 字段 | 类型 | 说明 |
|------|------|------|
| `thinkingEnabled` | boolean | 启用深度推理（默认：根据模型预设自动） |
| `reasoningEffort` | `"max"` \| `"high"` | 推理深度（默认：`"max"`） |
| `model` | string | 模型 ID（通过 `/model` 命令管理） |
| `notify` | string | 通知脚本路径 |
| `webSearchTool` | string | 自定义搜索脚本路径 |
| `mcpServers` | object | MCP 服务器配置 |
| `disabledSkills` | string[] | 禁用的技能列表 |

详见 [docs/configuration.md](docs/configuration.md)。

## 🏗️ 架构

```
┌──────────────────────────────────────────────┐
│           Terminal UI (Ink/React)             │
│  LoginScreen  WelcomeScreen  PromptInput      │
├──────────────────────────────────────────────┤
│           Session Manager                     │
│  ┌──────────┐  ┌──────────────────────────┐  │
│  │ LLM Client│  │     Tool Executor        │  │
│  │ (OpenAI)  │  │  Bash Read Write Edit    │  │
│  │           │  │  WebSearch MCP           │  │
│  │ DeepSeek  │  └──────────────────────────┘  │
│  │ GLM Qwen  │                                │
│  │ MiMo      │  ┌──────────────────────────┐  │
│  └──────────┘  │     MCP Manager           │  │
│                └──────────────────────────┘  │
├──────────────────────────────────────────────┤
│        Skills · Marketplace · Plugins         │
│   ~/.agents/skills/  ./.agents/skills/       │
└──────────────────────────────────────────────┘
```

完整架构文档：[docs/architecture.md](docs/architecture.md) — 包含数据流图、模型解析、会话生命周期和设计决策。

**交互式架构图：** [docs/architecture-diagram.drawio](docs/architecture-diagram.drawio) — 使用 [draw.io](https://app.diagrams.net/) 打开，支持分层展开查看详情。

## 🧪 开发

```bash
npm install
npm run check      # TypeCheck + Lint + Format
npm run bundle     # esbuild → dist/cli.js
npm test           # 335 个测试
```

见 [CLAUDE.md](CLAUDE.md) 了解项目约定和开发指南。

## 🤝 参与贡献

欢迎贡献！Bug 修复、新功能、技能、文档都欢迎。

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feat/my-feature`
3. 提交（遵循 [Conventional Commits](https://www.conventionalcommits.org/)）
4. Push 并创建 Pull Request

PR 将在 3 操作系统 × 3 Node 版本（18 jobs）上运行 CI。

## 📄 许可证

[MIT](LICENSE) © CropCode Contributors

## 🙏 致谢

CropCode 基于以下优秀开源项目构建：

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — 终端 AI 助手的标杆
- [DeepSeek](https://platform.deepseek.com) · [智谱 GLM](https://open.bigmodel.cn) · [通义千问](https://bailian.console.aliyun.com) · [小米 MiMo](https://platform.xiaomimimo.com) — 大模型服务
- [Ink](https://github.com/vadimdemedes/ink) — React 终端渲染引擎
- [OpenAI Node.js SDK](https://github.com/openai/openai-node) — LLM API 客户端
- [MCP](https://modelcontextprotocol.io/) — AI 工具集成协议
- [esbuild](https://esbuild.github.io/) — 高速 JavaScript 构建工具
