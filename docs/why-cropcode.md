# 为什么选择 CropCode？

> CropCode vs 其他 AI Coding Agent 的功能对比

## 一句话定位

CropCode 是一个**开源、多供应商、终端原生的 AI Coding Agent**。对标 Claude Code 和 Codex，但在供应商自由度、技能生态和开发者体验上做了差异化设计。

---

## 核心差异

| 功能 | Claude Code | Codex (OpenAI) | Cursor | **CropCode** |
|------|:---:|:---:|:---:|:---:|
| **运行环境** | 终端 TUI | 终端 TUI | GUI IDE | 终端 TUI |
| **LLM 供应商** | Anthropic only | OpenAI only | 多供应商 | **4 家国产供应商** |
| **内置登录系统** | OAuth | API Key 手动 | 内置 | **TUI 交互式向导** |
| **Thinking 模式** | Extended Thinking | ❌ | ❌ | **deepseek+qwen 双格式** |
| **国内直连** | 需代理 | 需代理 | 部分 | **✅ 全部直连** |
| **插件市场** | ❌ | ❌ | 扩展市场 | **✅ 社区市场** |
| **自定义 Skill** | CLAUDE.md | .codex.md | .cursorrules | **SKILL.md + 市场分发** |
| **会话管理** | ✅ | ✅ | ✅ | ✅ |
| **撤销/恢复** | ✅ | ✅ | 有限 | ✅ |
| **数据分析** | 通过 Bash | 通过 Bash | 通过扩展 | **Python/R 原生集成** |
| **MCP 协议** | ✅ | 部分 | 部分 | ✅ |
| **论文工具** | ❌ | ❌ | ❌ | **✅ LaTeX/引用/图表** |
| **终端预览** | ❌ | ❌ | ❌ | **✅ 图片/公式/表格** |
| **Token 计费** | API 自带 | API 自带 | 订阅制 | **按模型分开统计** |
| **开源** | ❌ | ❌ | ❌ | **✅ MIT** |

---

## 五大杀手锏

### 1. 多供应商 TUI 登录 — 一键切换，无需代理

传统 coding agent 要么绑定单一供应商，要么需要手动编辑 JSON 配置文件。CropCode 提供**终端原生的交互式登录向导**：

```
 ╭─────────────────────────────────────────────────────────╮
 │  🌾 选择 AI 供应商                                      │
 │                                                        │
 │ ▶ 🔥 DeepSeek    最便宜·代码最强·送500万tokens          │
 │   🧠 智谱 GLM     免费模型·Coding Plan·推理最强         │
 │   ☁️ 通义千问      阿里云生态·Coding Plan·90天免费      │
 │   📱 MiMo 小米     1M超长上下文·Token Plan·开源          │
 ╰─────────────────────────────────────────────────────────╯
```

三步完成：选供应商 → 选模型 → 输入 API Key。不用编辑任何文件。

**切换供应商**: `/login` → 重新选择  
**切换模型**: `/model` → 同供应商内切换

### 2. 技能市场 — AI Agent 的"应用商店"

CropCode 是**第一个**引入社区技能市场的 coding agent。任何人可以发布、分享、安装技能：

```bash
# 注册社区市场
cropcode marketplace add https://github.com/addyosmani/agent-skills.git
cropcode marketplace add https://github.com/Yuan1z0825/nature-skills.git

# 浏览可用技能
cropcode marketplace list

# 一键安装
cropcode plugin install code-review@agent-skills
```

技能自动匹配：输入 prompt 时，CropCode 通过 LLM 判断用户意图，自动激活相关技能。

**已经可以安装的技能**：

| 市场 | 技能数 | 领域 |
|------|:---:|------|
| [agent-skills](https://github.com/addyosmani/agent-skills) | 6+ | 代码审查、测试、重构、调试、文档 |
| [nature-skills](https://github.com/Yuan1z0825/nature-skills) | 10 | 论文写作、数据、图表、文献、审稿 |

详见 [技能市场指南](marketplace-guide.md)。

### 3. 深度推理 — 双格式 Thinking 适配

不同供应商的 thinking 协议不同。CropCode 自动适配：

| 供应商 | Thinking 协议 | 适配方式 |
|--------|:---:|------|
| DeepSeek | `{thinking:{type:"enabled"}}` + `reasoning_effort` | 原生支持 |
| GLM | 同 DeepSeek | 原生支持 |
| MiMo | 同 DeepSeek，但**不支持** `reasoning_effort` | 自动过滤无效参数 |
| Qwen | `{enable_thinking:true}` + `thinking_budget` | reasoning_effort → budget 映射 |

用户只需通过 `/model` 选择 thinking 开关和强度（max/high），其余全部自动处理。

### 4. 科学计算原生集成

CropCode 内置 Python/R 数据分析最佳实践：

- 自动配置中文字体（matplotlib 图表不乱码）
- 数据清洗 → 统计分析 → 可视化 → 报告输出，全流程自主完成
- LaTeX 排版、参考文献管理、论文图表生成 — 学术工作流开箱即用

### 5. 终端原生预览 — 图表、公式、数据不出终端

CropCode 是**唯一**支持终端内联预览的 coding agent：

- **图片内联** — matplotlib/ggplot 生成的图表直接显示（iTerm2/Kitty 协议）
- **LaTeX → Unicode** — 80+ 数学符号实时转换，论文公式在终端可读
- **CSV 表格** — 自动检测分隔符，自适应列宽 ASCII 表格
- **增强 Markdown** — GFM 表格、任务列表、LaTeX 数学混排

```
> 分析实验数据，画产量对比图

[Image Preview]
████░░░░████████████████  ← 内联柱状图
/tmp/plot.png

> 查看 result.csv
┌─────────────────────────┐
│ 品种  │ 产量  │ 蛋白质  │
│ 京411 │ 6850  │ 12.3   │
└─────────────────────────┘
```

### 6. 开源 & 可自托管

MIT 许可证。你可以：

- Fork 并修改任何代码
- 添加自定义供应商
- 部署到私有服务器
- 贡献代码和技能到社区

---

## 什么时候选 CropCode？

| 你的需求 | 推荐 |
|----------|------|
| 在国内，不想配置代理 | **CropCode** |
| 想用国产大模型 (DeepSeek/GLM/Qwen/MiMo) | **CropCode** |
| 需要学术论文辅助 (LaTeX/引用/图表) | **CropCode** |
| 想试用不同模型，来回切换对比 | **CropCode** |
| 团队内部共享技能和工作流 | **CropCode** |
| 需要最流畅的英文代码体验 | Claude Code |
| 重度使用 GPT 生态 (Codex/GPT-5) | Codex / Cursor |
| GUI 重度用户，不习惯终端 | Cursor / Copilot |

---

## 技术架构可信度

CropCode 不是"套壳"——所有 LLM 交互、工具调用、会话管理都是自主实现的：

- **335 个测试** 覆盖核心路径 (tool execution, session, streaming, prompt)
- **CI 矩阵**: 3 OS × 3 Node 版本 = 9 个 job
- **完整架构文档**: [architecture.md](architecture.md)
- **供应商适配**: 精确到每个模型的 thinking 格式、reasoning_effort 支持、reasoning_content 回放

---

## 下一步

- [快速开始](../README.md#快速开始) — 5 分钟上手
- [技能市场指南](marketplace-guide.md) — 安装你的第一个社区技能
- [系统架构](architecture.md) — 深入理解内部设计
