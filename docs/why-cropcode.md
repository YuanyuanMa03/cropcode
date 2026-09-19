# 为什么选择 CropCode

> 设计取舍、与主流工具的客观对比、以及当前的边界

## 定位

CropCode 是一个**开源、多供应商、终端原生的 AI 编程代理**。它与 Claude Code、Codex CLI 属于同一形态：模型在授权的工具环境里自主完成多步骤任务。差异不在"能不能干活"，而在下面四个设计取舍。

## 设计取舍

### 1. Harness 自主实现，MIT 开源

agent 循环、工具执行、权限门控、上下文压缩、会话持久化全部自研，不依赖任何闭源运行时。带来的直接收益：

- **可审计**：权限逻辑、上下文裁剪策略都是可读的 TypeScript，安全敏感场景可以逐行核对
- **可修改**：加工具、改协议、换默认行为都是常规 PR，不存在上游黑盒
- **可自托管**：私有网络环境可完整运行，不回传遥测

### 2. 供应商自由

四家 OpenAI 兼容供应商（DeepSeek、智谱 GLM、通义千问、小米 MiMo）接入同一套界面：

- **两种计费**：按量计费 API Key 与订阅制套餐（GLM/Qwen Coding Plan、MiMo Token Plan）并存，`/login` 三步切换
- **协议适配**：deepseek 与 qwen 两种 thinking 协议的格式差异、reasoning_effort 与 thinking_budget 的参数映射、reasoning_content 回放，全部由核心层处理，上层无感知
- **国内直连**：四个供应商的 API 在中国大陆均可直接访问，无需代理

### 3. 技能分发标准化

技能是 `SKILL.md` 标准格式的知识包，分发不经过中心化商店：

```bash
cropcode marketplace add <任意 Git 仓库或本地路径>
cropcode plugin install <技能名>@<市场名>
```

任何 GitHub 仓库都可以成为技能市场。技能在输入 prompt 时按意图自动激活，不需要手动启用。

### 4. 科研工作流的默认优化

项目的初始场景是农业科研：Python/R 数据分析、LaTeX 排版、论文图表。系统提示词与内置技能面向这条工作流调优，例如 matplotlib 中文字体自动配置。

## 与主流工具对比

只列可客观核实的维度，不做能力打分：

| 维度 | Claude Code | Codex CLI | Cursor | CropCode |
|------|-------------|-----------|--------|----------|
| 许可证 | 专有 | 专有 | 专有 | **MIT 开源** |
| 模型供应商 | Anthropic | OpenAI | 多家（订阅内） | 4 家国产，密钥自有 |
| 计费模型 | API / 订阅 | API / 订阅 | 订阅制 | 供应商原生计费 |
| 运行形态 | 终端 | 终端 | GUI IDE | 终端 |
| 扩展机制 | 插件 + MCP | AGENTS.md + MCP | 扩展市场 | SKILL.md + 社区市场 + MCP |
| 中国大陆直连 | 需代理 | 需代理 | 部分 | 全部直连 |
| 生态成熟度 | 高 | 高 | 高 | 早期 |

## 当前边界

不回避的差距（截至 v2.1.0）：

- **单 agent 循环**：暂无并行子代理，复杂任务串行完成
- **网络工具以 WebSearch 为主**：无内置网页抓取工具；WebSearch 依赖自定义脚本或 LLM 端搜索
- **生态早期**：社区市场技能数量有限，主要靠核心能力而非插件广度

## 什么时候选 CropCode

| 你的情况 | 建议 |
|----------|------|
| 在中国大陆，不想配代理 | CropCode |
| 想用国产模型且保留切换自由 | CropCode |
| 需要 MIT 开源 / 可审计 / 私有部署 | CropCode |
| 科研数据分析 + 论文写作工作流 | CropCode |
| 需要最强模型与最成熟生态 | Claude Code / Cursor |
| GPT 生态重度用户 | Codex CLI |
| 习惯 GUI 编辑器 | Cursor / Copilot |

## 技术可信度

- **372 个测试**（core 190 + cli 182）覆盖工具执行、会话管理、流式解析、权限评估、压缩策略
- **CI 矩阵**：3 操作系统 × 3 Node 版本（9 任务）
- **架构文档**：[architecture.md](architecture.md) 包含完整数据流、模块分解与设计决策
