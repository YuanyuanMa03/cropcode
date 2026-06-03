# CropCode 技能市场指南

> 如何发现、安装、编写和分享 CropCode 技能（Skills）

## 目录

- [什么是 Skill](#什么是-skill)
- [快速开始：从社区市场安装](#快速开始从社区市场安装)
- [实战：安装 addyosmani/agent-skills](#实战安装-addyosmaniageent-skills)
- [自己编写 Skill](#自己编写-skill)
- [创建你自己的市场](#创建你自己的市场)
- [Skill 最佳实践](#skill-最佳实践)

---

## 什么是 Skill

Skill 是一个 Markdown 文件，告诉 CropCode 在特定场景下如何使用特定的领域知识、工具或工作流。它包含：

- **触发条件** — 什么时候激活这个 skill
- **系统提示** — 注入到 LLM 上下文中的额外指令
- **工具配置** — 特定场景下的工具使用偏好

```
~/.agents/skills/
  ├── code-review/
  │   └── SKILL.md          ← skill 定义
  ├── data-analysis/
  │   └── SKILL.md
  └── paper-writing/
      └── SKILL.md
```

---

## 快速开始：从社区市场安装

### 1. 注册市场

```bash
cropcode marketplace add https://github.com/addyosmani/agent-skills.git
cropcode marketplace add https://github.com/Yuan1z0825/nature-skills.git
```

### 2. 浏览可用技能

```bash
cropcode marketplace list
```

输出示例：
```
nature-skills (https://github.com/Yuan1z0825/nature-skills.git)
  ├─ nature-writing      学术论文写作辅助
  ├─ nature-polishing     论文润色与语法修正
  ├─ nature-reviewer      同行评审辅助
  ├─ nature-data          数据分析与统计
  ├─ nature-figure        论文图表生成
  ├─ nature-reader        文献阅读与摘要
  ├─ nature-citation      参考文献管理
  ├─ nature-search        学术文献检索
  ├─ nature-response      审稿意见回复
  └─ nature-paper2ppt     论文转PPT

agent-skills (https://github.com/addyosmani/agent-skills.git)
  ├─ code-review          代码审查
  ├─ testing              测试生成
  ├─ documentation        API 文档生成
  ├─ refactoring          代码重构
  ├─ debugging            调试辅助
  └─ ...
```

### 3. 安装技能

```bash
# 从指定市场安装
cropcode plugin install code-review@agent-skills
cropcode plugin install nature-writing@nature-skills

# 安装后即可使用 —— CropCode 会自动匹配并激活
```

### 4. 在对话中使用

安装后无需手动调用。CropCode 在每次对话时自动匹配 skill：

```
> 帮我审查 src/tools/edit-handler.ts 的代码质量

CropCode 自动匹配并激活 code-review skill
→ 使用代码审查最佳实践进行分析
```

你也可以通过 `/skills` 命令查看当前已加载的技能列表。

---

## 实战：安装 addyosmani/agent-skills

[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) 是 Google Chrome 工程副总裁 Addy Osmani 维护的 Agent Skills 集合，包含经过实战验证的编程辅助技能。

### 步骤 1：注册市场

```bash
cropcode marketplace add https://github.com/addyosmani/agent-skills.git
```

### 步骤 2：浏览可用技能

```bash
cropcode marketplace list
```

你会看到类似这样的技能列表：

| 技能名称 | 用途 | 适用场景 |
|----------|------|----------|
| `code-review` | 系统化代码审查 | PR review、代码质量检查 |
| `testing` | 测试用例生成 | 单元测试、集成测试、边界测试 |
| `documentation` | 文档生成 | API 文档、README、注释 |
| `refactoring` | 代码重构 | 性能优化、结构改进 |
| `debugging` | 调试辅助 | 错误分析、根因定位 |
| `architecture` | 架构设计 | 系统设计、技术选型 |

### 步骤 3：安装需要的技能

```bash
# 安装代码审查技能
cropcode plugin install code-review@agent-skills

# 安装测试生成技能
cropcode plugin install testing@agent-skills

# 安装文档生成技能
cropcode plugin install documentation@agent-skills
```

### 步骤 4：开始使用

```
> 帮我 review 一下 src/session.ts，重点关注安全和性能问题

CropCode 自动激活 code-review skill，按照最佳实践进行审查。
```

```
> 给 src/common/openai-client.ts 的 createOpenAIClient 函数写单元测试

CropCode 自动激活 testing skill，生成全面的测试用例。
```

---

## 自己编写 Skill

### Skill 文件结构

```
~/.agents/skills/<skill-name>/
  └── SKILL.md
```

### SKILL.md 格式

```markdown
---
name: <skill-name>
description: <一句话描述，用于 LLM 匹配>
---

# <Skill 标题>

## 适用场景

描述什么情况下应该使用这个 skill。

## 工作流程

1. 第一步
2. 第二步
3. ...

## 注意事项

- 需要注意的点
- 常见的坑
```

### 示例 1：Python 数据分析 Skill

创建 `~/.agents/skills/python-data/SKILL.md`：

```markdown
---
name: python-data
description: Python 数据分析和科学计算工作流，包含 pandas/numpy/matplotlib 最佳实践
---

# Python 数据分析

## 适用场景

- 用户要求分析 CSV/Excel/JSON 数据
- 需要统计摘要、数据清洗、可视化
- 科学计算和数值模拟

## 工作流程

1. **读取数据**: 先用 `head()` 和 `info()` 了解数据结构
2. **清洗**: 处理缺失值、异常值、类型转换
3. **分析**: 统计描述、分组聚合、相关性分析
4. **可视化**: matplotlib/seaborn 作图，中文字体配置
5. **输出**: 保存处理后的数据和图表到文件

## 代码规范

- 使用 `pathlib.Path` 处理文件路径
- 始终设置中文字体: `plt.rcParams['font.sans-serif'] = ['Arial Unicode MS']`
- 处理大数据集时使用 `chunksize` 分批读取
- 每次分析前先检查 `df.dtypes` 和 `df.isnull().sum()`

## 注意事项

- macOS 上中文字体优先使用 Arial Unicode MS
- 输出文件命名使用下划线: `cleaned_data.csv`
- 图表保存为 300 DPI 的 PNG
```

### 示例 2：代码审查 Skill

创建 `~/.agents/skills/code-review/SKILL.md`：

```markdown
---
name: code-review
description: 系统性代码审查，关注安全、性能、可维护性和最佳实践
---

# 代码审查

## 审查维度

按优先级排列：

### 1. 安全性 (最高优先级)
- SQL 注入、XSS、命令注入风险
- 敏感信息泄露 (API key、密码、token)
- 权限和认证问题
- 输入验证和输出编码

### 2. 正确性
- 边界条件和 edge cases
- 错误处理完整性
- 并发安全和竞态条件
- 类型安全 (TypeScript)

### 3. 性能
- N+1 查询
- 不必要的内存分配
- 阻塞操作
- 缓存策略

### 4. 可维护性
- 命名清晰度
- 函数长度和复杂度
- 重复代码
- 测试覆盖

## 工作流程

1. 阅读变更的代码
2. 按维度逐项审查
3. 对每个问题给出: 严重级别、具体位置、修复建议
4. 最后给出总体评价

## 输出格式

```
## Code Review: <文件或功能名>

### 严重问题 (必须修复)
- [ ] **<位置>**: <问题描述>
  - 风险: <具体风险>
  - 修复: <建议方案>

### 建议改进
- [ ] **<位置>**: <改进建议>

### 亮点
- <做得好的地方>

### 总体评价
<一句话总结>
```
```

### 示例 3：Git Commit 规范 Skill

创建 `~/.agents/skills/git-commit/SKILL.md`：

```markdown
---
name: git-commit
description: 生成符合 Conventional Commits 规范的 commit message
---

# Git Commit 规范

## 适用场景

用户要求提交代码变更时，生成规范的 commit message。

## 格式

```
<type>: <简短描述>

<详细说明 (可选)>

<footer (可选)>
```

## Type 类型

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `refactor` | 代码重构 (无功能变更) |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具/依赖 |
| `style` | 格式变更 |

## 规则

1. 标题不超过 72 字符
2. 使用中文描述具体变更内容
3. 如果有关联 issue，在 footer 标注: `Closes #123`
4. 多个作者时添加: `Co-Authored-By: Name <email>`

## 示例

```
feat: 添加 Markdown 渲染组件支持代码高亮

使用 highlight.js 实现代码块语法高亮，支持 30+ 语言。
新增 SyntaxHighlight 组件和对应的单元测试。

Closes #42
```
```

---

## 创建你自己的市场

### 市场结构

```
my-skills/
  ├── .claude-plugin/
  │   └── marketplace.json     ← 市场清单
  ├── code-review/
  │   └── SKILL.md
  ├── testing/
  │   └── SKILL.md
  └── ...
```

### marketplace.json 格式

```json
{
  "name": "my-skills",
  "version": "1.0.0",
  "description": "我的 CropCode 技能集",
  "author": "Your Name",
  "plugins": [
    {
      "name": "code-review",
      "version": "1.0.0",
      "description": "系统性代码审查技能",
      "entry": "SKILL.md"
    },
    {
      "name": "testing",
      "version": "1.0.0",
      "description": "测试用例生成技能",
      "entry": "SKILL.md"
    }
  ]
}
```

### 发布市场

```bash
# 1. 推送到 GitHub
git init
git add .
git commit -m "feat: initial marketplace"
git remote add origin https://github.com/<your-username>/my-skills.git
git push -u origin main

# 2. 任何人可以注册使用
cropcode marketplace add https://github.com/<your-username>/my-skills.git
```

---

## Skill 最佳实践

### 1. 描述要精准

`description` 字段是 LLM 用来决定是否激活 skill 的唯一依据。好的描述：

```yaml
# ✅ 好 — 明确说明何时使用
description: 当用户要求审查代码、检查代码质量、或做 PR review 时使用

# ❌ 差 — 太模糊
description: 代码相关的东西
```

### 2. 指令要具体

```markdown
# ✅ 好 — 具体可执行
1. 使用 `pd.read_csv(file, encoding='utf-8')` 读取 CSV
2. 检查 `df.isnull().sum()` 了解缺失情况

# ❌ 差 — 太抽象
1. 读取数据
2. 检查数据
```

### 3. 关注差异化

Skill 应该提供通用 prompt 之外的**特定领域知识**：

```markdown
# ✅ 好 — 领域特定
- 气象数据中 -999 表示缺失值
- NetCDF 文件使用 xarray 库读取
- 时间维度通常命名为 'time' 或 't'

# ❌ 差 — 通用知识
- 变量命名要有意义
- 代码要有注释
```

### 4. Skill 文件要简洁

- 单个 SKILL.md 不超过 200 行
- 用清晰的小标题分段
- 避免大段文字，用列表和表格

### 5. 测试你的 Skill

```bash
# 启动 CropCode
cropcode

# 输入触发你的 skill 的提示
> <你的测试 prompt>

# 检查 skill 是否被激活
> /skills
```

---

## 总结

| 方式 | 难度 | 适用场景 |
|------|:---:|------|
| 从社区市场安装 | ⭐ 简单 | 大多数需求 |
| 自己编写 Skill | ⭐⭐ 中等 | 特定领域需求 |
| 创建市场分享 | ⭐⭐⭐ 进阶 | 团队/社区共享 |

更多信息见 [plugins-skills-marketplace.md](plugins-skills-marketplace.md)。
