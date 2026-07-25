# CropCode 软件架构文档

> 版本：2.0.0 | 最后更新：2026-07-24

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [核心模块](#3-核心模块)
4. [Session 管理](#4-session-管理)
5. [上下文压缩机制](#5-上下文压缩机制)
6. [权限系统](#6-权限系统)
7. [工具执行引擎](#7-工具执行引擎)
8. [Hooks 系统](#8-hooks-系统)
9. [UI 层架构](#9-ui-层架构)
10. [MCP 集成](#10-mcp-集成)
11. [Marketplace 插件系统](#11-marketplace-插件系统)
12. [配置系统](#12-配置系统)
13. [构建与测试](#13-构建与测试)

---

## 1. 项目概述

CropCode 是一个基于 TypeScript + React (Ink) 构建的 AI 编程代理 CLI 工具。它通过 OpenAI 兼容 API 与大语言模型交互，提供代码编辑、文件操作、终端命令执行、Web 搜索等能力，并支持 MCP 协议扩展和插件市场。

### 技术栈

| 层级 | 技术 |
|------|------|
| 语言 | TypeScript (ESM, strict mode) |
| UI 框架 | React + Ink (终端 TUI) |
| 构建工具 | esbuild |
| 包管理 | npm |
| 运行时 | Node.js >= 22 |
| 测试 | 自定义测试框架 + `tsx --test` |

### 入口点

```
packages/cli/src/cli.tsx → 解析命令行参数 → 启动 Ink TUI → AppContainer → App
```

---

## 2. 系统架构

v2.0.0 起采用 npm workspaces monorepo（对齐 deepcode 工程结构），核心库与 CLI 分包：

```
┌─────────────────────────────────────────────────────────────┐
│  packages/cli  (@YuanyuanMa03/cropcode-cli)                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CLI 入口 (src/cli.tsx) + AsciiArt + LoginScreen       │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  UI 层 (src/ui/)                                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ │  │
│  │  │   App    │ │ Prompt   │ │ Permission│ │ Session  │ │  │
│  │  │ (主视图) │ │  Input   │ │  Prompt   │ │   List   │ │  │
│  │  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └─────┬────┘ │  │
│  │  views / components / contexts / hooks / core         │  │
│  └────────────────────┬───────────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────────┘
                        │ 依赖 @YuanyuanMa03/cropcode-core
┌───────────────────────┼──────────────────────────────────────┐
│  packages/core (@YuanyuanMa03/cropcode-core)                  │
│  ┌─────────────────────┴──────────────────────────────────┐  │
│  │  Session 层 (src/session.ts)                            │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  SessionManager                                     │ │  │
│  │  │  - 会话生命周期管理 / 上下文压缩 (auto/reactive/micro) │ │  │
│  │  │  - 权限计算与请求 / 工具执行协调                       │ │  │
│  │  └────────────────────┬───────────────────────────────┘ │  │
│  ├───────────────────────┼────────────────────────────────┤  │
│  │             工具层 (src/tools/)                         │  │
│  │  ┌────────┐ ┌──────┴───┐ ┌──────┐ ┌──────┐ ┌────┐      │  │
│  │  │  Bash  │ │ Executor │ │ Read │ │Write │ │Edit│ ...  │  │
│  │  └────────┘ └──────────┘ └──────┘ └──────┘ └────┘      │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  公共层 (src/common/)                                   │  │
│  │  OpenAI Client / Permissions / Model Capabilities /     │  │
│  │  Provider Presets / Model Discovery / LLM Error /       │  │
│  │  Hooks Engine / Runtime / Validate / Tool Types         │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  扩展层                                                 │  │
│  │  ┌──────────────────┐  ┌──────────────────────┐        │  │
│  │  │ MCP (src/mcp/)   │  │ Marketplace          │        │  │
│  │  │ Model Context    │  │ (src/marketplace/)   │        │  │
│  │  │ Protocol 集成    │  │ 插件市场系统          │        │  │
│  │  └──────────────────┘  └──────────────────────┘        │  │
│  │  Hooks (src/hooks/) — PreToolUse / PostToolUse 引擎     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

> 图中 `src/...` 均为各包内相对路径（即 `packages/<pkg>/src/...`）。

### 目录结构

```
cropcode/
├── package.json               # 根：workspaces 编排、构建脚本、devDeps
├── tsconfig.json              # composite + references → core / cli
├── packages/
│   ├── core/                  # @YuanyuanMa03/cropcode-core（内核）
│   │   ├── package.json       # main: dist/index.js, deps(openai/zod/undici/ejs/...)
│   │   ├── tsconfig.json      # composite, declaration, outDir dist
│   │   ├── templates/         # prompts / settings / skills / tools（运行时模板）
│   │   └── src/
│   │       ├── index.ts             # 公共 API 边界（对外导出）
│   │       ├── session.ts           # SessionManager - 核心会话管理
│   │       ├── prompt.ts            # System prompt 构建，工具定义
│   │       ├── settings.ts          # 配置类型定义与解析
│   │       ├── common/              # 公共工具库
│   │       │   ├── model-capabilities.ts   # 模型能力检测，压缩阈值计算
│   │       │   ├── model-discovery.ts      # 动态模型发现 (GET /models)
│   │       │   ├── openai-client.ts        # OpenAI API 客户端封装
│   │       │   ├── openai-message-converter.ts # OpenAI 消息格式转换
│   │       │   ├── openai-thinking.ts      # Thinking/Reasoning 模式支持
│   │       │   ├── provider-presets.ts     # 内置 Provider 预设
│   │       │   ├── providers.ts            # LLM Provider / 凭据管理
│   │       │   ├── permissions.ts          # 权限计算引擎
│   │       │   ├── tool-types.ts           # 共享工具类型（破除循环依赖）
│   │       │   ├── runtime.ts / validate.ts # 工具运行时与参数校验
│   │       │   ├── llm-error.ts            # 凭据安全的 LLM 错误描述
│   │       │   ├── error-logger.ts         # 错误日志（脱敏）
│   │       │   ├── file-history.ts         # 文件历史快照 (checkpoint/restore)
│   │       │   ├── file-utils.ts / retry.ts / notify.ts / state.ts
│   │       │   ├── shell-utils.ts / process-tree.ts / bash-timeout.ts
│   │       │   └── debug-logger.ts / tool-result-storage.ts
│   │       ├── tools/               # 工具处理器
│   │       │   ├── executor.ts            # ToolExecutor - 工具执行引擎
│   │       │   ├── bash-handler.ts / read-handler.ts / write-handler.ts
│   │       │   ├── edit-handler.ts / glob-handler.ts / grep-handler.ts
│   │       │   ├── web-search-handler.ts / ask-user-question-handler.ts
│   │       │   └── update-plan-handler.ts
│   │       ├── hooks/               # Hooks 系统（cropcode 独有）
│   │       │   ├── types.ts / engine.ts / index.ts
│   │       ├── mcp/                 # MCP 协议集成
│   │       │   ├── mcp-client.ts / mcp-manager.ts
│   │       ├── marketplace/         # 插件市场（cropcode 独有）
│   │       │   ├── marketplace-manager.ts / marketplace-repo.ts / types.ts / index.ts
│   │       └── tests/               # core 测试套件 (185 个)
│   │
│   └── cli/                   # @YuanyuanMa03/cropcode-cli（UI + 入口）
│       ├── package.json       # bin: cropcode → dist/cli.js, deps(core file:../core, ink/react/...)
│       ├── tsconfig.json      # paths 别名 → core/src，jsx，noEmit
│       └── src/
│           ├── cli.tsx              # CLI 入口，参数解析，启动 TUI
│           ├── AsciiArt.ts          # 启动 ASCII 艺术
│           ├── common/
│           │   └── update-check.ts  # npm 版本更新检查（v2.0.0 从 core 迁入）
│           ├── ui/                  # Ink TUI 组件
│           │   ├── views/           # App / AppContainer / PromptInput /
│           │   │                    # PermissionPrompt / SessionList / WelcomeScreen /
│           │   │                    # LoginScreen / UpdatePrompt / ...
│           │   ├── components/      # MessageView / FileMentionMenu /
│           │   │                    # ModelsDropdown / SkillsDropdown / PermissionsDropdown / ...
│           │   ├── contexts/        # AppContext / RawModeContext
│           │   ├── hooks/           # useHistoryNavigation / usePasteHandling / useTerminalInput
│           │   └── core/            # slash-commands / prompt-buffer / file-mentions /
│           │                        # clipboard / ask-user-question / thinking-state / ...
│           └── tests/               # cli 测试套件 (182 个)
│
├── scripts/                   # 构建编排
│   ├── build.js                     # 三步：core tsc → rewrite-esm-imports → cli bundle
│   ├── esbuild.config.js            # splitting/metafile/keepNames
│   ├── rewrite-esm-imports.js       # tsc 产物补 .js 扩展
│   ├── copy-bundle-assets.js        # core/templates → cli/dist/templates
│   ├── build-portable.mjs           # 自包含 portable bundle
│   ├── package-distributions.mjs    # 打包平台分发包 (win/mac/linux)
│   └── generate-git-commit-info.js / clean.js / start.js
├── install.sh / install.ps1   # 一键安装引导（下载 release 分发包）
├── resources/ docs/           # 静态资源与文档
└── .github/workflows/         # ci.yml (check+bundle+test) / release.yml (package:all)
```

---

## 3. 核心模块

### 3.1 SessionManager (`packages/core/src/session.ts`)

SessionManager 是系统的核心，负责管理整个会话生命周期。

```typescript
export class SessionManager {
  // 核心方法
  createSession(userPrompt, controller): Promise<string>
  runSession(sessionId, controller): Promise<void>
  deleteSession(sessionId): boolean
  listSessions(): SessionEntry[]
  cleanupExpiredSessions(retentionDays?): number

  // 会话恢复
  restoreSessionConversation(sessionId, messageId): SessionMessage[]
  restoreSessionCode(sessionId, messageId): void

  // 内部机制
  private autoCompactIfNeeded(): void
  private microcompactSession(): void
  private reactiveCompact(): void
  private executeToolCalls(): Promise<ToolCallExecution[]>
}
```

**关键数据类型：**

```typescript
type SessionEntry = {
  id: string
  summary: string | null
  status: SessionStatus
  usage: ModelUsage | null
  usagePerModel: Record<string, ModelUsage> | null
  activeTokens: number
  createTime: string
  updateTime: string
  lastAccessTime: string     // 用于过期清理
  processes: Map<string, SessionProcessEntry> | null
  askPermissions?: AskPermissionRequest[]
}

type SessionMessage = {
  id: string
  sessionId: string
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  compacted: boolean
  visible: boolean
  meta?: MessageMeta
  checkpointHash?: string
}
```

### 3.2 ToolExecutor (`packages/core/src/tools/executor.ts`)

工具执行引擎，支持并发执行和 Hook 集成。

```typescript
export class ToolExecutor {
  constructor(
    projectRoot: string,
    createOpenAIClient?: CreateOpenAIClient,
    mcpManager?: McpManager,
    hooksSettings?: HooksSettings,
    sessionId?: string
  )

  async executeToolCalls(
    sessionId: string,
    toolCalls: unknown[],
    hooks?: ToolExecutionHooks
  ): Promise<ToolCallExecution[]>
}
```

### 3.3 OpenAI Client (`packages/core/src/common/openai-client.ts`)

封装 OpenAI 兼容 API，支持流式响应、thinking 模式、多模态输入。

---

## 4. Session 管理

### 4.1 会话生命周期

```
用户输入 → createSession() → runSession() → [LLM 交互循环] → 完成/中断
                                                              ↓
                                                     deleteSession() / cleanupExpiredSessions()
```

### 4.2 持久化机制

会话数据存储在项目目录下的 `.cropcode/` 文件夹：

```
.cropcode/
├── sessions.json              # 会话索引 (SessionEntry[])
├── <session-id-1>.jsonl       # 会话消息 (每行一条 JSON)
├── <session-id-2>.jsonl
├── settings.json              # 项目配置
└── file-history/              # 文件快照
```

**会话索引** (`sessions.json`)：
- 按 `updateTime` 倒序排列
- 最多保留 50 个会话 (`MAX_SESSION_ENTRIES`)
- 超出时自动清理最旧的会话资源

**消息存储** (`.jsonl`)：
- 每条消息一行 JSON，支持增量追加 (`appendFileSync`)
- 包含消息内容、元数据、checkpoint hash

### 4.3 自动清理

```typescript
// 30 天未访问的会话自动清理
cleanupExpiredSessions(retentionDays: number = 30): number
```

- 基于 `lastAccessTime` 判断（每次访问自动更新）
- 清理时同时删除消息文件和进程资源
- 向下兼容：旧会话没有 `lastAccessTime` 时使用 `updateTime`

### 4.4 会话恢复

支持两种恢复模式：

1. **对话恢复** (`restoreSessionConversation`)：恢复到指定消息点，删除后续消息
2. **代码恢复** (`restoreSessionCode`)：通过 `checkpointHash` 恢复文件状态

---

## 5. 上下文压缩机制

CropCode 实现了四层压缩策略，参考 Claude Code 的架构设计。

### 5.1 自动压缩 (Auto-Compact)

当 token 使用量接近上下文窗口限制时自动触发。

**阈值计算：**

```typescript
// packages/core/src/common/model-capabilities.ts
threshold = effectiveContextWindow - outputReserved - buffer

// buffer 根据上下文窗口大小动态调整：
//   ≤ 400K tokens → 13K buffer
//   400K-800K     → 30K buffer
//   ≥ 800K        → 50K buffer
```

**公式对比：**

| 项目 | 阈值公式 | 实际触发点 |
|------|---------|-----------|
| CropCode (优化前) | `contextWindow * 0.4` | ~40% |
| CropCode (优化后) | `effectiveContextWindow - outputReserved - buffer` | ~83-93% |
| Claude Code | 同上 | ~83-93% |

### 5.2 Microcompact（微压缩）

当工具结果数量超过阈值时，裁剪旧结果而不触发全量压缩。

```typescript
const MICROCOMPACT_TRIGGER_THRESHOLD = 10  // 超过 10 个工具结果时触发
const MICROCOMPACT_KEEP_RECENT = 5         // 保留最近 5 个

// 裁剪逻辑：将旧的 tool role 消息 content 替换为
// "[Previous tool result cleared to save context]"
```

### 5.3 Reactive Compact（响应式压缩）

当 API 返回 `prompt_too_long` 错误时，立即触发压缩并重试。

```typescript
// 在 API 调用的 catch 块中：
if (apiErrMsg.includes("too many tokens") || apiErrMsg.includes("prompt_too_long")) {
  await this.reactiveCompact()
  iteration -= 1  // 重试当前迭代
  continue
}
```

### 5.4 Circuit Breaker（断路器）

连续压缩失败 3 次后停止自动压缩，避免无限循环。

```typescript
const MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3

// 压缩成功 → 重置计数器
// 压缩失败 → 计数器 +1
// 计数器 ≥ 3 → 跳过自动压缩
```

### 5.5 压缩流程图

```
API 调用前检查 token 使用量
        │
        ▼
  ┌─────────────┐    否
  │ 超过阈值？   │────────→ 正常调用 API
  └──────┬──────┘
         │ 是
         ▼
  ┌─────────────┐    是
  │ 断路器触发？ │────────→ 跳过压缩，直接调用
  └──────┬──────┘
         │ 否
         ▼
    执行自动压缩
         │
    ┌────┴────┐
    │ 成功？   │
    └────┬────┘
   是    │    否
   │     │    │
   ▼     │    ▼
 重置    │  计数器 +1
 断路器  │
         ▼
    调用 API
         │
    ┌────┴────────┐
    │ prompt_too  │
    │ _long 错误？ │
    └────┬────────┘
   是    │    否
   │     │    │
   ▼     │    ▼
 执行    │  正常处理
 reactive│
 compact │
```

---

## 6. 权限系统

### 6.1 权限范围 (PermissionScope)

```typescript
type PermissionScope =
  | "read-in-cwd"      // 项目内读取
  | "read-out-cwd"     // 项目外读取
  | "write-in-cwd"     // 项目内写入
  | "write-out-cwd"    // 项目外写入
  | "delete-in-cwd"    // 项目内删除
  | "delete-out-cwd"   // 项目外删除
  | "query-git-log"    // Git 日志查询
  | "mutate-git-log"   // Git 日志修改
  | "network"          // 网络访问
  | "mcp"              // MCP 工具调用
```

### 6.2 权限模式 (PermissionDefaultMode)

```typescript
type PermissionDefaultMode =
  | "ask"               // 变更前确认：读取自动允许，写入/删除/网络/MCP 询问
  | "acceptEdits"       // 自动编辑（默认）：文件读写删除自动允许，网络/MCP/Bash 询问
  | "plan"              // 计划模式：只读允许，写入/删除/网络/MCP 询问
  | "bypassPermissions" // 完全访问：跳过所有检查（含 deny 和 unknown）
```

**各模式行为矩阵：**

| 操作类型 | ask | acceptEdits | plan | bypassPermissions |
|---------|-----|-------------|------|-------------------|
| 文件读取 | allow | allow | allow | allow |
| 文件写入 | ask | allow | ask | allow |
| 文件删除 | ask | allow | ask | allow |
| Git 查询 | allow | allow | allow | allow |
| Git 修改 | ask | ask | ask | allow |
| 网络访问 | ask | ask | ask | allow |
| MCP 调用 | ask | ask | ask | allow |

> 注：`ask` 与 `plan` 在权限评估层行为一致（只读自动通过，其余询问），区别体现在产品语义。
> 旧值（`allowAll`/`askAll`）及非法值经 `normalizePermissionDefaultMode` 回退到 `acceptEdits`。

### 6.3 权限评估流程

```
工具调用请求
     │
     ▼
解析工具参数 (parseToolCallForPermissions)
     │
     ▼
描述权限请求 (describeToolPermissionRequest)
  - read/Read   → 根据路径判断 read-in-cwd / read-out-cwd
  - write/Write → 根据路径判断 write-in-cwd / write-out-cwd
  - edit/Edit   → 同 write
  - bash/Bash   → 解析 sideEffects 数组
  - WebSearch   → network
  - mcp__*      → mcp
     │
     ▼
评估权限 (evaluatePermissionScopes)
  1. 检查 deny 列表 → 命中则 deny
  2. 检查 ask 列表  → 命中则 ask
  3. 检查 allow 列表 → 全部命中则 allow
  4. 根据 defaultMode 决策
     │
     ▼
返回 PermissionDecision: "allow" | "deny" | "ask"
```

### 6.4 权限配置

权限在三个层级配置，按优先级合并：

1. **用户级** (`~/.cropcode/settings.json`)
2. **项目级** (`.cropcode/settings.json`)
3. **运行时** (用户交互选择 "always allow")

```json
{
  "permissions": {
    "allow": ["read-in-cwd", "write-in-cwd"],
    "deny": [],
    "ask": ["network", "mcp"],
    "defaultMode": "acceptEdits"
  }
}
```

### 6.5 权限 UI

`PermissionPrompt` 组件在 `ask_permission` 状态下渲染：

- 显示工具名称、命令、描述
- 显示需要授权的权限范围
- 提供 Allow / Deny / Always Allow 选项
- 支持 `pendingPermissionReply` 模式（拒绝后用户可补充上下文再发送）

---

## 7. 工具执行引擎

### 7.1 内置工具

| 工具名 | 处理器 | 功能 |
|--------|--------|------|
| `bash` / `Bash` | `bash-handler.ts` | 执行 shell 命令，支持超时、进程树管理 |
| `read` / `Read` | `read-handler.ts` | 读取文件内容，支持图片 |
| `write` / `Write` | `write-handler.ts` | 写入文件，支持 JSON 修复 |
| `edit` / `Edit` | `edit-handler.ts` | 基于 diff 的文件编辑，支持 loose-escape 匹配 |
| `WebSearch` | `web-search-handler.ts` | Web 搜索，支持自定义脚本 |
| `AskUserQuestion` | `ask-user-question-handler.ts` | 向用户提问 |
| `UpdatePlan` | `update-plan-handler.ts` | 更新执行计划 |

### 7.2 并发执行

工具按安全性分为两类：

```typescript
// 可并发执行的工具（只读，无副作用）
CONCURRENCY_SAFE_TOOLS = new Set(["read", "Read", "WebSearch"])

// 其他工具串行执行
```

**执行策略：**

```
toolCalls: [read, read, bash, read, write]
     │
     ▼
分区：
  batch1: [read, read]     ← 并发 (Promise.allSettled)
  batch2: [bash]           ← 串行
  batch3: [read]           ← 串行（与 write 不同 batch）
  batch4: [write]          ← 串行
     │
     ▼
按顺序执行每个 batch
```

### 7.3 Hook 集成

每个工具调用前后自动触发 Hooks：

```
PreToolUse Hook → 工具执行 → PostToolUse/PostToolUseFailure Hook
     │                              │
     ├─ blocked? → 返回错误          └─ 记录结果
     ├─ updatedInput? → 使用新参数
     └─ additionalContext? → 附加到结果
```

---

## 8. Hooks 系统

### 8.1 事件类型

```typescript
type HookEvent =
  | "PreToolUse"          // 工具执行前
  | "PostToolUse"         // 工具执行后（成功）
  | "PostToolUseFailure"  // 工具执行后（失败）
  | "SessionStart"        // 会话开始
  | "SessionEnd"          // 会话结束
  | "Stop"                // 停止
  | "UserPromptSubmit"    // 用户提交输入
  | "PreCompact"          // 压缩前
  | "PostCompact"         // 压缩后
```

### 8.2 Hook 类型

```typescript
type HookConfig = {
  type: "command"     // Shell 命令
  command: string     // 要执行的命令
  timeout?: number    // 超时（毫秒），默认 30 秒
}
```

### 8.3 配置格式

在 `settings.json` 中配置：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Write",
        "hooks": [
          {
            "type": "command",
            "command": "my-lint-script.sh",
            "timeout": 30000
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "edit",
        "hooks": [
          {
            "type": "command",
            "command": "auto-format.sh"
          }
        ]
      }
    ]
  }
}
```

### 8.4 Matcher 匹配规则

- **精确匹配**：`"Bash"` 匹配工具名 `Bash`
- **多工具匹配**：`"Bash|Write"` 匹配 `Bash` 或 `Write`
- **通配符**：`"mcp__*"` 匹配所有 MCP 工具
- **无 matcher**：匹配所有工具

### 8.5 执行协议

**输入** (JSON via stdin)：

```json
{
  "event": "PreToolUse",
  "sessionId": "uuid",
  "projectRoot": "/path/to/project",
  "toolName": "bash",
  "toolInput": { "command": "ls -la" }
}
```

**输出** (JSON via stdout)：

```json
{
  "decision": "approve",
  "additionalContext": "命令安全",
  "updatedInput": { "command": "ls -la --color=never" }
}
```

**退出码协议：**

| 退出码 | 含义 |
|--------|------|
| 0 | 成功，stdout 作为结果 |
| 2 | 阻断，stderr 作为阻断原因 |
| 其他 | 非阻断错误 |

### 8.6 执行引擎

```typescript
// packages/core/src/hooks/engine.ts
export async function executeHooks(
  event: HookEvent,
  toolName: string | undefined,
  input: HookInput,
  settings: HooksSettings
): Promise<HookExecutionResult[]>

export function aggregateHookResults(
  results: HookExecutionResult[]
): HookResult
```

- 同一事件的所有匹配 Hooks **并行执行**
- 结果聚合：任一 Hook 阻断则整体阻断
- `additionalContext` 拼接，`updatedInput` 合并

---

## 9. UI 层架构

### 9.1 组件层次

```
AppContainer
  └── App (主视图)
        ├── WelcomeScreen          # 首次进入
        ├── SessionList            # 会话列表
        ├── PromptInput            # 用户输入
        ├── PermissionPrompt       # 权限确认
        ├── AskUserQuestionPrompt  # 工具提问
        ├── SlashCommandMenu       # 斜杠命令菜单
        ├── UndoSelector           # 撤销选择器
        ├── ProcessStdoutView      # 进程输出
        ├── McpStatusList          # MCP 状态
        └── MessageView            # 消息渲染
              ├── TextMessage
              ├── ToolCallMessage
              ├── ToolResultMessage
              └── ThinkingMessage
```

### 9.2 状态管理

使用 React Context 管理全局状态：

```typescript
// AppContext
type AppState = {
  sessions: SessionEntry[]
  activeSessionId: string | null
  activeStatus: SessionStatus
  messages: SessionMessage[]
  busy: boolean
  // ...
}
```

### 9.3 输入系统

`PromptInput` 组件处理用户输入：

- **历史导航**：上下箭头浏览历史输入
- **@文件提及**：`@` 触发文件补全菜单
- **斜杠命令**：`/` 触发命令菜单
- **粘贴处理**：支持多行粘贴、图片粘贴
- **撤销/重做**：Ctrl+Z / Ctrl+Y

### 9.4 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 发送输入 |
| `Escape` | 取消/返回 |
| `Ctrl+C` | 中断当前操作 |
| `Ctrl+D` | 退出 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Up/Down` | 历史导航 |
| `Tab` | 补全 |

---

## 10. MCP 集成

### 10.1 架构

```
McpManager
  ├── McpClient (server-1)  ←→  MCP Server 1
  ├── McpClient (server-2)  ←→  MCP Server 2
  └── McpClient (server-N)  ←→  MCP Server N
```

### 10.2 配置

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": { "API_KEY": "..." }
    }
  }
}
```

### 10.3 功能

- 自动发现 MCP 工具并注册为可用工具
- 工具名前缀 `mcp__<server>__<tool>`
- 支持 SSE 和 stdio 传输
- 工具列表变更时自动通知 UI

---

## 11. Marketplace 插件系统

### 11.1 概念

```
Marketplace (Git 仓库)
  ├── manifest.json          # 市场清单
  ├── plugin-a/
  │   ├── plugin.json        # 插件配置
  │   ├── prompts/           # 提示词模板
  │   └── tools/             # 工具定义
  └── plugin-b/
      └── ...
```

### 11.2 管理命令

```bash
cropcode marketplace add <name> <git-url>
cropcode marketplace remove <name>
cropcode marketplace list
cropcode plugin install <plugin> --from <marketplace>
cropcode plugin remove <plugin>
cropcode plugin list
```

### 11.3 存储结构

```
~/.cropcode/
├── marketplaces/            # 市场仓库克隆
│   └── <marketplace-name>/
├── plugins/                 # 已安装插件
│   └── <plugin-name>/
└── plugins-cache/           # 插件缓存
```

---

## 12. 配置系统

### 12.1 配置层级

```
环境变量 (.env)
     ↓
用户配置 (~/.cropcode/settings.json)
     ↓
项目配置 (.cropcode/settings.json)
     ↓
运行时覆盖 (命令行参数、用户交互)
```

### 12.2 配置字段

```typescript
type CropcodeSettings = {
  env?: Record<string, string>
  apiKey?: string
  baseURL?: string
  model?: string
  thinkingEnabled?: boolean
  reasoningEffort?: "high" | "max"
  debugLogEnabled?: boolean
  notify?: string
  webSearchTool?: string
  mcpServers?: Record<string, McpServerConfig>
  disabledSkills?: string[]
  permissions?: PermissionSettings
  hooks?: HooksSettings
}
```

### 12.3 Provider 预设

内置多个 LLM Provider 预设，支持 OpenAI 兼容 API：

```typescript
// packages/core/src/common/provider-presets.ts
BUILTIN_PROVIDERS = [
  { name: "DeepSeek", baseURL: "https://api.deepseek.com", models: [...] },
  { name: "OpenAI", baseURL: "https://api.openai.com/v1", models: [...] },
  // ...
]
```

---

## 13. 构建与测试

### 13.1 命令

```bash
npm run build        # 完整构建：core tsc → rewrite-esm-imports → cli esbuild bundle
npm run check        # 检查：typecheck (workspaces) + lint + format:check
npm run typecheck    # 各 workspace 的 tsc --noEmit
npm run lint         # ESLint (packages/*/src + scripts)
npm run test         # 运行全部测试 (core 185 + cli 182 = 367 个)
npm run bundle       # 单独打包 CLI (esbuild + copy assets) → packages/cli/dist/cli.js
npm run bundle:portable  # 自包含 portable bundle → dist-portable/cli.js
npm run package:all      # 打包平台分发包 → release/ (win/mac/linux + SHA256SUMS)
```

### 13.2 构建流程

monorepo 三步编排（`scripts/build.js`）：

```
packages/core/src/                packages/cli/src/
       │                                 │
       └─ tsc -p (composite)             │
            ↓                            │
       packages/core/dist/               │
       (+ rewrite-esm-imports.js         │
        给相对导入补 .js 扩展)            │
            │                            │
            └────────┬───────────────────┘
                     ↓
              esbuild (scripts/esbuild.config.js)
              packages: "bundle" 内联 core
                     │
                     ├── 入口: packages/cli/src/cli.tsx
                     ├── 平台: node / 格式: ESM / 目标: node22
                     ├── splitting + metafile + keepNames
                     └── 输出: packages/cli/dist/cli.js (+ chunks/)
                     │
                     └─ copy-bundle-assets.js
                        core/templates → cli/dist/templates
                        core/templates/skills/bundled → cli/dist/bundled
```

### 13.3 测试覆盖

367 个测试覆盖以下模块（core 185 + cli 182）：

| 模块 | 测试文件 | 覆盖内容 |
|------|---------|---------|
| Session | packages/core/src/tests/session.test.ts | 创建、压缩、恢复、删除 |
| 权限 | packages/core/src/tests/permissions.test.ts | 权限评估 |
| 工具 | packages/core/src/tests/*.test.ts | executor / handlers |
| 模型 | packages/core/src/tests/openai-thinking.test.ts | Thinking 模式 |
| MCP | packages/core/src/tests/mcp-client.test.ts | 客户端连接 |
| UI | packages/cli/src/tests/*.test.ts | 组件交互、输入处理 |
| 其他 | packages/core/src/tests/{process-tree,debug-logger}.test.ts | 工具函数 |

---

## 附录 A：数据流总览

```
用户输入
  │
  ▼
PromptInput → SessionManager.createSession()
  │
  ▼
构建 System Prompt (prompt.ts)
  │  - 工具定义（按字母序排列，优化 prompt cache）
  │  - 运行时上下文
  │  - 技能提示词
  │
  ▼
调用 OpenAI API
  │
  ├── 检查 token 使用量
  │     └── 接近阈值？→ auto-compact
  │
  ├── API 返回
  │     ├── 成功 → 解析工具调用
  │     └── prompt_too_long → reactive-compact → 重试
  │
  ▼
工具执行 (ToolExecutor)
  │
  ├── PreToolUse Hooks
  │     └── blocked? → 返回错误
  │
  ├── 并发分区
  │     ├── safe tools → Promise.allSettled
  │     └── serial tools → 顺序执行
  │
  ├── PostToolUse Hooks
  │
  └── 结果返回
        │
        ▼
  权限检查
        │
        ├── allow → 继续
        ├── deny → 返回拒绝消息
        └── ask → 显示 PermissionPrompt → 等待用户
              │
              ▼
  更新 Session Messages
        │
        ▼
  Microcompact 检查（工具结果 > 10？）
        │
        ▼
  下一轮迭代（直到无工具调用或达到 maxIterations）
```

---

## 附录 B：关键常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `MAX_SESSION_ENTRIES` | 50 | 最大会话数 |
| `DEFAULT_SESSION_RETENTION_DAYS` | 30 | 会话保留天数 |
| `MICROCOMPACT_TRIGGER_THRESHOLD` | 10 | 微压缩触发阈值 |
| `MICROCOMPACT_KEEP_RECENT` | 5 | 微压缩保留数 |
| `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES` | 3 | 断路器阈值 |
| `MAX_OUTPUT_TOKENS_FOR_SUMMARY` | 20,000 | 压缩摘要最大输出 |
| `AUTOCOMPACT_BUFFER_TOKENS` | 13,000 | ≤400K 模型 buffer |
| `AUTOCOMPACT_BUFFER_400K` | 30,000 | 400K-800K 模型 buffer |
| `AUTOCOMPACT_BUFFER_800K` | 50,000 | ≥800K 模型 buffer |
| `DEFAULT_HOOK_TIMEOUT_MS` | 30,000 | Hook 默认超时 |

---

## 附录 C：类型导出索引

### `packages/core/src/session.ts`
`SessionEntry`, `SessionMessage`, `SessionMessageRole`, `SessionStatus`, `ModelUsage`, `SessionProcessEntry`, `SessionsIndex`, `MessageMeta`, `UndoTarget`, `UserPromptContent`, `SkillInfo`, `SessionManager`

### `packages/core/src/settings.ts`
`CropcodeSettings`, `ResolvedCropcodeSettings`, `CropcodeEnv`, `ModelConfigSelection`, `PermissionScope`, `PermissionDefaultMode`, `PermissionSettings`, `HookEvent`, `HookConfig`, `HookMatcher`, `HooksSettings`, `McpServerConfig`, `EnabledSkillsSettings`, `ReasoningEffort`

### `packages/core/src/common/permissions.ts`
`PermissionDecision`, `UserToolPermission`, `MessageToolPermission`, `AskPermissionRequest`, `PermissionPlan`, `computeToolCallPermissions`, `evaluatePermissionScopes`

### `packages/core/src/tools/executor.ts`
`ToolExecutor`, `ToolCall`, `ToolExecutionResult`, `ToolCallExecution`, `ToolHandler`, `ToolExecutionContext`

### `packages/core/src/hooks/`
`HookEvent`, `HookConfig`, `HookMatcher`, `HooksSettings`, `HookInput`, `HookResult`, `HookExecutionResult`, `executeHooks`, `aggregateHookResults`

### `packages/core/src/common/model-capabilities.ts`
`getCompactPromptTokenThreshold`, `getContextWindowForModel`, `getEffectiveContextWindow`, `getMaxOutputTokens`, `supportsMultimodal`, `supportsThinking`, `supportsReasoningEffort`, `MICROCOMPACT_TRIGGER_THRESHOLD`, `MICROCOMPACT_KEEP_RECENT`, `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES`
