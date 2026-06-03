# CropCode 系统架构

> AI Coding Agent 完整技术架构文档

## 整体分层

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI 入口 (cli.tsx)                        │
│              Ink React TUI 渲染到终端                        │
├─────────────────────────────────────────────────────────────┤
│                      UI 层 (src/ui/)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ App.tsx  │ │LoginScreen│ │WelcomeScr│ │ PromptInput   │  │
│  │ 状态中枢  │ │ 登录向导  │ │ 头部信息  │ │ 输入/命令/模型 │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   会话层 (src/session.ts)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │SessionMgr│ │Streaming │ │Compaction│ │Skill Matching │  │
│  │CRUD/状态 │ │SSE 解析  │ │Token预算  │ │意图识别/匹配   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    工具层 (src/tools/)                       │
│  ┌────┐ ┌────┐ ┌─────┐ ┌────┐ ┌─────────┐ ┌───────────┐  │
│  │Bash│ │Read│ │Write│ │Edit│ │WebSearch│ │AskQuestion│  │
│  └────┘ └────┘ └─────┘ └────┘ └─────────┘ └───────────┘  │
│                      ToolExecutor                           │
├─────────────────────────────────────────────────────────────┤
│                   公共层 (src/common/)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │OpenAI    │ │Provider  │ │Thinking  │ │Model          │  │
│  │Client    │ │Presets   │ │Options   │ │Capabilities   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │Providers │ │File Utils│ │Shell Utils│                  │
│  │凭证管理   │ │读写/状态  │ │进程管理    │                  │
│  └──────────┘ └──────────┘ └──────────┘                   │
├─────────────────────────────────────────────────────────────┤
│                 扩展层 (src/marketplace/ src/mcp/)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │Plugin Mgr│ │MCP Client│ │Skills    │                   │
│  │安装/注册  │ │外部工具   │ │领域知识   │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## 核心数据流：一次完整对话

```
用户输入 "分析 data.csv，画分布图"
        │
        ▼
┌─ PromptInput ─────────────────────────────────────────────┐
│  解析 slash command，识别 @file mentions，构建 prompt      │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌─ App.handlePrompt ───────────────────────────────────────┐
│  /login /model /new /resume → 路由到对应处理器             │
│  普通消息 → handleUserPrompt(prompt)                     │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌─ SessionManager ─────────────────────────────────────────┐
│  ├─ 无 session? → createSession()                        │
│  └─ 有 session? → replySession()                         │
│       ├─ 构建 system messages + skill matching           │
│       └─ activateSession() ──────────────┐               │
└───────────────────────────────────────────┼───────────────┘
                                            │
        ┌───────────────────────────────────┘
        ▼
┌─ activateSession (核心循环, max 80000 iter) ─────────────┐
│                                                          │
│  ① createOpenAIClient()  → 解析凭证/设置/模型/thinking    │
│  ② buildOpenAIMessages() → 过滤/配对/多模态/thinking 回放 │
│  ③ buildThinkingRequestOptions() → 供应商特定参数         │
│  ④ createChatCompletionStream() → SSE 流式调用           │
│  ⑤ 处理结果: content / tool_calls (递归) / refusal       │
│  ⑥ 更新 session usage/tokens/status                     │
└──────────────────────────────────────────────────────────┘
```

## 模型解析优先级

```
有凭证 (credentials.json 存在):
┌──────────────────────────────────────────────┐
│  HARD OVERRIDE (不可覆盖)                    │
│  apiKey, baseURL, model, thinking  ← 凭证   │
└──────────────────────────────────────────────┘
         │ (凭证为空时走下面)
         ▼
┌──────────────────────────────────────────────┐
│  普通解析链 (resolveSettingsSources)         │
│  1. CROPCODE_* 环境变量                      │
│  2. ./.cropcode/settings.json               │
│  3. ~/.cropcode/settings.json               │
│  4. 默认值 (首个内置供应商首模型)              │
└──────────────────────────────────────────────┘
```

## 会话生命周期

| 阶段 | 函数 | 关键操作 |
|------|------|----------|
| 创建 | `createSession()` | 生成 UUID, 构建 system messages, skill matching |
| 续接 | `replySession()` | 追加用户消息, skill matching |
| 核心循环 | `activateSession()` | LLM 调用 → 工具执行 → 循环 (max 80k iter) |
| 持久化 | `saveSession()` | sessions-index.json + uuid.jsonl |

## 工具系统

| 工具 | 功能 | 内部 LLM 调用 |
|------|------|:---:|
| Bash | 执行 shell 命令, timeout 控制, Windows Git Bash 兼容 | ❌ |
| Read | 读取文件, 支持图片/PDF, snippet 管理 | ❌ |
| Write | 写入/覆盖文件, JSON 修复, 文件状态记录 | ❌ |
| Edit | 精确字符串替换, 转义修复, 匹配诊断 | ✅ (纠错/诊断) |
| WebSearch | 配置脚本或默认 LLM 搜索 | ✅ (翻译/分类) |
| AskUserQuestion | 向用户提问, 收集回答 | ❌ |
| UpdatePlan | 任务列表管理 | ❌ |

## 多供应商适配

### Provider Presets 结构

```typescript
{
  id: "deepseek",
  label: "DeepSeek", icon: "🔥",
  baseURL: "https://api.deepseek.com",
  models: [{
    id: "deepseek-v4-pro",
    contextWindow: "1M",
    pricing: { input: 3, output: 6 },  // ¥/M tokens
    multimodal: false,
    supportsThinking: true,
    thinkingFormat: "deepseek" | "qwen",
    reasoningEfforts: ["high", "max"],  // 可选
  }]
}
```

### Thinking 格式差异

| 供应商 | Format | reasoning_effort | 请求参数 |
|--------|:---:|:---:|------|
| DeepSeek | `deepseek` | 直接传递 | `{thinking:{type:"enabled"}} + extra_body` |
| GLM | `deepseek` | 直接传递 | 同 DeepSeek |
| Qwen | `qwen` | → thinking_budget | `{enable_thinking:true, thinking_budget:5000\|10000}` |
| MiMo | `deepseek` | 不传递 | `{thinking:{type:"enabled"}}` 无 extra_body |

### 接入方式

| 供应商 | API Key 格式 | 套餐 | Base URL |
|--------|------------|------|------|
| DeepSeek | `sk-...` | — | `api.deepseek.com` |
| GLM | 智谱 API Key | Coding Plan (3档) | `open.bigmodel.cn` |
| Qwen | 阿里云 API Key | Coding Plan (1档) | `dashscope.aliyuncs.com` |
| MiMo | `tp-...` | Token Plan (4档) | `token-plan-cn.xiaomimimo.com` |

## reasoning_content 多轮回放

Thinking 模式供应商严格要求每条 assistant 消息携带 `reasoning_content`：

```typescript
sessionMessageToOpenAIMessage(msg, thinkingEnabled, model)
  // 有存储的 thinking 内容 → 回放
  if (msg.messageParams?.reasoning_content) → 设置 reasoning_content
  // thinking 模式下的 assistant 消息 → 发送空字符串
  else if (thinkingEnabled && msg.role === "assistant") → reasoning_content: ""
```

## 凭证管理系统

```
~/.cropcode/credentials.json
{
  activeProvider: "mimo",
  providers: {
    mimo: {
      providerId, apiKey, activeModel, mode,
      thinkingEnabled?, reasoningEffort?
    }
  }
}

API:
  getActiveCredential()  hasCredentials()    getActiveApiKey()
  getActiveBaseURL()     getActiveModel()    getActiveProviderLabel()
  getActiveModelLabel()  getActiveThinkingEnabled()
  getActiveReasoningEffort()
  setActiveCredential(providerId, apiKey, model, mode, thinking?, reasoning?)
```

## 状态同步矩阵

| 事件 | credentials.json | settings.json | UI (resolvedSettings) | API Client |
|------|:---:|:---:|:---:|:---:|
| 启动 (有凭证) | 读 | 读 (兜底) | 初始化 | 未调用 |
| 启动 (无凭证) | — | 读 (主源) | 初始化 | 未调用 |
| 登录完成 | **写** | 不变 | **刷新** | 下次会话 |
| /model | **写** (model+thinking) | 跳过 | **刷新** | 下次会话 |
| 每次对话 | 读 | 读 | 不变 | **新建** |
| 工具内调用 | 读 | 读 | 不变 | **新建** |

## 流式输出

```
createChatCompletionStream(client, {model, messages, tools, ...thinking})
  ├─ chat.completions.create({ stream: true, stream_options: {include_usage} })
  ├─ for await (chunk)
  │   ├─ delta.content → aggregate
  │   ├─ delta.reasoning_content → aggregate (thinking 模式)
  │   ├─ delta.tool_calls → aggregate
  │   └─ chunk.usage → capture
  └─ return { choices: [{ message }], usage }
```

## 消息构建与 Compaction

```
buildOpenAIMessages(messages, thinkingEnabled, model)
  ├─ 过滤 compacted 消息
  ├─ 配对 tool_call ↔ tool_result (修复缺失/孤儿)
  ├─ sessionMessageToOpenAIMessage() 逐条转换
  │   ├─ reasoning_content 回放 (thinking 模式)
  │   └─ 多模态过滤 (非多模态模型移除图片)
  └─ 返回 OpenAI 格式消息数组

Compaction:
  activeTokens > contextWindow * 0.4
  → LLM 生成摘要 → 标记旧消息 compacted
```

## MCP 集成

```
MCP Manager
  ├─ 配置: settings.json mcpServers / CROPCODE_MCP_* env
  ├─ 进程管理: spawn stdio/SSE server, 自动 -y, 失败重连
  ├─ 工具发现: tools/list → 缓存 → 注入 ToolExecutor
  └─ 资源访问: resources/read
```

## Skill 系统

```
Skill 来源: ~/.agents/skills/ | ./.agents/skills/ | marketplace
Skill 匹配: LLM 意图识别 → 注入匹配的 skill prompt
Plugin Marketplace: marketplace add/list, plugin install
```

## 关键设计决策

| 决策 | 原因 |
|------|------|
| 凭证 hard-override | 用户显式登录是最强意图信号 |
| 有凭证时不写 settings.json | 单一真相来源，避免双源污染 |
| Client 按 apiKey::baseURL 缓存 | 换供应商才重建连接 |
| reasoning_content 空字符串回放 | Thinking API 硬性要求 |
| 未知模型默认多模态 | 自定义模型 (gpt-4o) 不被错误过滤 |
| esbuild 单文件 bundle | 不依赖运行时打包器 |

## 与 Claude Code 对齐

| 维度 | Claude Code | CropCode |
|------|-------------|----------|
| 交互模式 | TUI (Ink/React) | TUI (Ink/React) |
| 工具系统 | Bash/Read/Write/Edit/WebSearch | 对齐 + UpdatePlan/AskUserQuestion |
| 会话管理 | CRUD + undo + compaction | 对齐 |
| 多供应商 | Anthropic only | **4 家 (差异化优势)** |
| Thinking | extended thinking | **deepseek + qwen 双格式** |
| 凭证 | OAuth/API key | **TUI 登录向导** |
| Skill | CLAUDE.md | marketplace + plugins |
| MCP | 多 transport | stdio + SSE |

## 数据文件布局

```
~/.cropcode/
  ├─ credentials.json            ← 多供应商凭证
  ├─ settings.json               ← 用户全局配置
  ├─ machine-id                  ← 匿名机器标识
  ├─ projects/<hash>/
  │   ├─ sessions-index.json     ← session 索引
  │   └─ <uuid>.jsonl            ← 消息流
  └─ plugins/cache/              ← 已安装插件
```
