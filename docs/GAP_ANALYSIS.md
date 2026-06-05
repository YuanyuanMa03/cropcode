# CropCode 差距分析

> 与当前主流 AI Coding Agent 的能力对比
> 更新日期：2026-06-04

---

## 目录

1. [竞品概览](#1-竞品概览)
2. [核心差距矩阵](#2-核心差距矩阵)
3. [关键差距详解](#3-关键差距详解)
4. [CropCode 现有优势](#4-cropcode-现有优势)
5. [改进路线图建议](#5-改进路线图建议)

---

## 1. 竞品概览

| 产品 | 类型 | 核心特点 |
|------|------|---------|
| **Claude Code** | CLI Agent | 多 Agent 协作、Hooks 系统、token 预算、IDE 集成 |
| **Cursor** | IDE Agent | 深度 IDE 集成、多文件编辑、codebase 索引 |
| **GitHub Copilot** | IDE + CLI | 最大用户基数、Copilot Workspace、PR Agent |
| **Aider** | CLI Agent | Git 原生集成、多模型支持、轻量级 |
| **Devin** | 自主 Agent | 全自主开发、浏览器操作、长任务执行 |
| **Windsurf (Codeium)** | IDE Agent | Cascade 流式编辑、上下文感知 |

---

## 2. 核心差距矩阵

> 评分：✅ 完整支持 | ⚠️ 部分支持 | ❌ 不支持

| 能力维度 | CropCode | Claude Code | Cursor | Copilot | Aider | Devin |
|---------|----------|-------------|--------|---------|-------|-------|
| **多 Agent 协作** | ❌ | ✅ | ❌ | ⚠️ | ❌ | ✅ |
| **后台任务** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Codebase 索引/RAG** | ❌ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| **Git 深度集成** | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **IDE 集成** | ❌ | ✅ | ✅ | ✅ | ❌ | ⚠️ |
| **浏览器操作** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **长任务自主执行** | ❌ | ⚠️ | ❌ | ❌ | ❌ | ✅ |
| **Checkpoint/回滚** | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| **Hooks/扩展系统** | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| **权限系统** | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| **上下文压缩** | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **MCP 协议** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **插件市场** | ⚠️ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Token 预算控制** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **子任务分解** | ❌ | ✅ | ❌ | ⚠️ | ❌ | ✅ |
| **测试自动运行** | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| **Cost 追踪** | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| **语音输入** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **终端 UI** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## 3. 关键差距详解

### 3.1 多 Agent 协作 ❌

**现状：** CropCode 是单 Agent 架构，一个会话只能串行执行任务。

**差距：**
- **Claude Code** 支持 Subagent 模式，主 Agent 可以派发子任务给专门的 Agent（代码审查、测试、探索等），并行执行后汇总结果。支持 Team 模式，多个 Agent 协作完成复杂任务。
- **Devin** 天然支持多步骤自主执行，可以同时运行代码、浏览网页、编辑文件。
- **GitHub Copilot** 的 Copilot Workspace 支持任务分解和并行执行。

**影响：** 复杂任务（如跨文件重构、全栈开发）效率远低于竞品。

**建议实现：**
```
SessionManager
  ├── 主 Agent（协调）
  ├── SubAgent: code-explorer    # 代码探索
  ├── SubAgent: test-runner      # 测试执行
  └── SubAgent: code-reviewer    # 代码审查
```

---

### 3.2 后台任务 ❌

**现状：** 所有操作都在前台执行，用户必须等待完成。

**差距：**
- **Claude Code** 支持 `run_in_background` 参数，长时间任务（构建、测试）在后台运行，用户可继续其他工作。完成后自动通知。
- **Devin** 的所有任务天然在后台运行。

**影响：** 用户体验差，长时间构建/测试时阻塞交互。

**建议实现：**
- 后台进程管理器，支持任务状态查询
- 完成通知（系统通知 + 终端内通知）
- 后台任务与前台交互的协调

---

### 3.3 Codebase 索引 / RAG ❌

**现状：** CropCode 没有代码库索引能力，每次需要理解代码时只能通过 `read` 工具逐文件读取。

**差距：**
- **Cursor** 拥有最强大的 codebase 索引，支持语义搜索、跨文件引用追踪、嵌入向量检索。
- **GitHub Copilot** 通过 GitHub 代码搜索提供全局代码理解。
- **Claude Code** 虽然没有内置 RAG，但通过 Explore Agent 和 grep/find 工具提供了高效代码搜索。

**影响：** 大型项目中，Agent 难以快速理解代码结构，需要大量 token 来"阅读"代码。

**建议实现：**
- 基于 AST 的代码索引
- 文件依赖图构建
- 语义搜索（嵌入向量）
- 增量更新索引

---

### 3.4 Git 深度集成 ⚠️

**现状：** CropCode 有 `GitFileHistory` 用于 checkpoint/restore，有 `query-git-log` 权限范围，但没有专门的 Git 工具。

**差距：**
- **Aider** 是 Git 原生的，每次修改自动 commit，支持 `--undo`，commit message 自动生成。
- **Claude Code** 有完整的 Git 工作流支持：创建分支、提交、PR 创建、冲突解决。
- **Cursor** 支持 Git diff 可视化和一键提交。

**影响：** 无法自动管理代码版本，用户需要手动处理 Git 操作。

**建议实现：**
- 内置 Git 工具（commit、branch、diff、log）
- 自动 checkpoint commit
- PR 创建集成
- 冲突自动解决

---

### 3.5 IDE 集成 ❌

**现状：** CropCode 是纯 CLI 工具，没有 IDE 集成。

**差距：**
- **Claude Code** 提供 VS Code 和 JetBrains 插件，支持 IDE 内直接交互、代码跳转、diff 预览。
- **Cursor** 本身就是 IDE，深度集成 AI 能力。
- **GitHub Copilot** 几乎支持所有主流 IDE。

**影响：** 只能在终端使用，无法利用 IDE 的代码导航、调试、重构能力。

**建议实现：**
- VS Code 扩展（LSP 协议）
- 代码跳转（Go to Definition）
- 内联 diff 预览
- IDE 内终端集成

---

### 3.6 浏览器操作 ❌

**现状：** CropCode 只有 `WebSearch` 工具（搜索 API），无法操作浏览器。

**差距：**
- **Devin** 内置浏览器，可以打开网页、填写表单、截图、调试前端。
- **Claude Code** 通过 Playwright MCP 支持浏览器操作。

**影响：** 无法进行端到端测试、UI 调试、网页内容抓取。

**建议实现：**
- 集成 Playwright MCP
- 浏览器截图工具
- E2E 测试支持

---

### 3.7 长任务自主执行 ❌

**现状：** CropCode 的迭代次数限制为 80000 次，但没有任务分解和进度追踪机制。

**差距：**
- **Devin** 可以接受一个高层任务描述，自主分解为子任务，执行数小时直到完成。
- **Claude Code** 通过 Task 系统支持任务分解，有 TaskCreate/TaskUpdate/TaskList 等工具。

**影响：** 无法处理"帮我完成整个功能"这类高层任务。

**建议实现：**
- 任务分解系统（Task Planner）
- 进度追踪 UI
- 自动重试和错误恢复
- 任务状态持久化

---

### 3.8 Token 预算控制 ❌

**现状：** CropCode 有 `maxIterations` 限制（80000），但没有 token 级别的预算控制。

**差距：**
- **Claude Code** 支持用户指定 token 预算（如 `+500k`、`use 2M tokens`），Agent 在预算内尽可能完成任务。有递减回报检测（连续 3 次 < 500 新 token 则停止）。

**影响：** 无法精确控制 API 成本，可能在简单任务上消耗过多 token。

**建议实现：**
- Token 预算解析（`+500k` 语法）
- BudgetTracker 跟踪消耗
- 递减回报检测
- 预算耗尽通知

---

### 3.9 测试自动运行 ⚠️

**现状：** CropCode 有 `npm test` 可以手动运行，但没有自动测试集成。

**差距：**
- **Aider** 核心特性之一：每次代码修改后自动运行测试，失败则自动修复。
- **Claude Code** 通过 Hooks 可以配置 PostToolUse 自动运行测试。
- **Devin** 自动运行测试并迭代修复。

**影响：** 代码质量保障依赖用户手动测试。

**建议实现：**
- PostToolUse Hook 自动触发测试
- 测试失败自动分析和修复
- 测试覆盖率追踪

---

### 3.10 Cost 追踪与持久化 ⚠️

**现状：** CropCode 追踪 `ModelUsage`（prompt_tokens, completion_tokens），但没有：
- 美元成本计算
- 成本持久化到磁盘
- 成本汇总显示
- `/cost` 命令

**差距：**
- **Claude Code** 有完整的 CostTracker，追踪每次 API 调用的 USD 成本，支持 `saveCurrentSessionCosts()` 持久化、`formatTotalCost()` 汇总显示。
- **Aider** 显示每次会话的 token 消耗和估算成本。

**建议实现：**
- CostTracker 模块
- 基于模型定价计算 USD 成本
- `/cost` 命令
- 会话成本持久化

---

### 3.11 多模态能力 ⚠️

**现状：** CropCode 支持图片输入（`imageUrls`），但没有：
- 截图分析
- UI 视觉对比
- 图片生成

**差距：**
- **Claude Code** 支持截图分析、UI 审查。
- **Devin** 可以截图浏览器、分析 UI 布局。

**建议实现：**
- 截图工具
- UI diff 分析
- 图片描述增强

---

### 3.12 语音输入 ❌

**现状：** 不支持。

**差距：**
- **Claude Code** 支持语音输入，通过麦克风录制转文字。

**影响：** 低优先级，但对移动端或无障碍场景有价值。

---

### 3.13 LSP 集成 ❌

**现状：** 没有 Language Server Protocol 集成。

**差距：**
- **Cursor** 深度集成 LSP，提供精确的代码补全、类型检查、重构建议。
- **Claude Code** 有 LSP 工具支持。

**影响：** 无法利用类型系统信息进行精确的代码修改。

**建议实现：**
- TypeScript LSP 客户端
- 诊断信息收集（类型错误、lint 警告）
- 基于诊断的自动修复

---

### 3.14 自动 PR / Code Review ❌

**现状：** 没有 PR 相关功能。

**差距：**
- **GitHub Copilot** 的 Copilot Workspace 可以自动创建 PR、Review PR。
- **Claude Code** 通过 GitHub MCP 支持 PR 创建和 Review。

**建议实现：**
- GitHub MCP 集成
- PR 创建工具
- PR Review 工具
- 自动 commit message 生成

---

## 4. CropCode 现有优势

尽管存在差距，CropCode 在以下方面具有竞争力：

### 4.1 架构成熟度 ✅
- 清晰的分层架构（UI → Session → Tools → Common）
- TypeScript strict mode，类型安全
- 362 个测试覆盖

### 4.2 权限系统 ✅
- 5 种权限模式，比大多数竞品更细粒度
- 三级配置（用户/项目/运行时）
- Hook 集成支持自定义权限逻辑

### 4.3 上下文压缩 ✅
- 四层压缩策略（auto/micro/reactive/circuit breaker）
- 与 Claude Code 同等水平的压缩算法
- 动态 buffer 缩放

### 4.4 MCP 协议支持 ✅
- 原生 MCP 集成
- 支持多个 MCP 服务器
- 工具自动发现和注册

### 4.5 终端 UI ✅
- Ink 框架提供丰富的终端交互
- 组件化设计，易于扩展
- 支持 Markdown 渲染、代码高亮

### 4.6 插件市场 ⚠️
- 基础的 marketplace 架构已存在
- Git-based 插件分发
- 需要进一步完善生态

---

## 5. 改进路线图建议

### Phase 1: 核心能力补齐（高优先级）

| 功能 | 工作量 | 影响 |
|------|--------|------|
| Git 工具内置 | 中 | 高 |
| Token 预算控制 | 小 | 高 |
| Cost 追踪持久化 | 小 | 中 |
| 测试自动运行 (Hooks) | 小 | 高 |

### Phase 2: 架构升级（中优先级）

| 功能 | 工作量 | 影响 |
|------|--------|------|
| 多 Agent / Subagent | 大 | 高 |
| 后台任务系统 | 中 | 高 |
| 任务分解与追踪 | 中 | 中 |
| LSP 集成 | 大 | 中 |

### Phase 3: 生态扩展（中低优先级）

| 功能 | 工作量 | 影响 |
|------|--------|------|
| Codebase 索引 / RAG | 大 | 高 |
| VS Code 扩展 | 大 | 高 |
| 浏览器操作 (Playwright) | 中 | 中 |
| PR 创建 / Review | 中 | 中 |

### Phase 4: 差异化功能（低优先级）

| 功能 | 工作量 | 影响 |
|------|--------|------|
| 语音输入 | 小 | 低 |
| 截图分析 | 中 | 中 |
| UI 视觉对比 | 中 | 中 |

---

## 附录：竞品关键特性参考

### Claude Code 核心能力
- 27 种 Hook 事件，4 种 Hook 类型
- Subagent + Team 模式
- Token 预算系统（`+500k` 语法）
- 后台任务执行
- CostTracker（USD 追踪、持久化）
- 语音输入
- VS Code / JetBrains 插件
- Worktree 隔离

### Cursor 核心能力
- 全 IDE 集成
- Codebase 语义索引（嵌入向量）
- 多文件同时编辑
- Chat + Edit + Agent 三种模式
- Composer 多步骤编排
- LSP 深度集成

### Aider 核心能力
- Git 原生（自动 commit）
- 多模型同时使用
- 测试驱动开发（自动运行测试）
- 轻量级，依赖少
- `/run` 命令执行任意命令
- Architect 模式（规划 + 执行分离）

### Devin 核心能力
- 全自主执行（数小时级别）
- 内置浏览器
- 内置终端
- 内置编辑器
- 长任务分解与追踪
- Slack/GitHub 集成
