# 插件、技能与市场

CropCode 提供灵活的多层扩展系统。你可以自由选择获取和管理技能的方式——从一键市场安装到完全手写的自定义技能。

[English](plugins-skills-marketplace_en.md)

---

## 快速对比

| 方式 | 适用场景 | 操作 |
|------|----------|------|
| **市场安装** | 团队共享、精选集合 | `cropcode marketplace add <url>` |
| **自定义技能** | 个人工作流、项目专属逻辑 | 将 `SKILL.md` 放入 `~/.agents/skills/` |
| **社区发现** | 从社区获取现成技能 | 在线浏览，通过市场或手动复制安装 |
| **Git 克隆** | 直接使用任意公开技能仓库 | `git clone` + 将本地路径注册为市场 |

---

## 1. 技能系统基础

**技能（Skill）** 是一个 Markdown 文件（`SKILL.md`），用于教会 CropCode 如何执行特定任务。技能会被加载到对话上下文中，指导 AI 的行为。

### 技能文件结构

```
~/.agents/skills/
  my-skill/
    SKILL.md          # 必需：技能定义文件
  another-skill/
    SKILL.md
```

或按项目组织：

```
your-project/
  .agents/
    skills/
      project-skill/
        SKILL.md
```

### SKILL.md 格式

每个技能以 YAML frontmatter 开头，后跟 Markdown 内容：

```markdown
---
name: my-skill
description: 一行描述这个技能的用途
license: MIT
---

# 我的技能

## 使用场景

描述在什么情况下触发这个技能。

## 指令

AI 需要遵循的步骤。

## 示例

具体的输入和预期输出示例。
```

**字段说明：**

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | 是 | 唯一标识符，对应 `/skill-name` 斜杠命令 |
| `description` | 是 | 在技能列表中显示的一行描述 |
| `license` | 否 | 许可证标识 |

### 内置技能

CropCode 自带以下内置技能（位于 `templates/skills/`）：

| 技能 | 用途 |
|------|------|
| `karpathy-guidelines` | 减少常见 LLM 编码错误的行为准则 |
| `plan-and-execute` | 实现前的结构化规划 |
| `agent-drift-guard` | 防止 AI 偏离任务 |

这些技能默认可用。你可以在配置中禁用任意技能：

```json
{
  "disabledSkills": ["karpathy-guidelines"]
}
```

### 使用技能

- 在提示符中输入 `/` 查看所有可用技能
- 输入 `/skills` 浏览并选择技能列表
- 技能也可根据 `description` 字段自动触发

---

## 2. 编写自定义技能

创建自定义技能是扩展 CropCode 最简单的方式——不需要市场，不需要安装，只需一个 Markdown 文件。

### 第一步：创建目录

```bash
mkdir -p ~/.agents/skills/my-custom-skill
```

### 第二步：编写 SKILL.md

```markdown
---
name: rice-analysis
description: 水稻产量数据分析标准化流程
---

# 水稻产量分析

## 使用场景

当用户要求分析水稻产量数据、对田间试验结果做方差分析或生成产量报告时使用此技能。

## 工作流程

1. 读取数据文件（CSV/Excel）
2. 检查缺失值和异常值（±3σ）
3. 使用线性模型进行方差分析
4. 运行 Tukey HSD 多重比较
5. 生成可发表的表格和图表

## 输出格式

- Markdown 格式的方差分析表
- 字母标注的多重比较结果（a, ab, b, ...）
- 带误差棒的箱线图或柱状图
```

### 第三步：使用

重启 CropCode（或用 `/new` 开始新会话），输入 `/` 即可在列表中看到你的技能。

### 项目级技能

对于项目专属的工作流，将技能放在项目目录下：

```bash
mkdir -p your-project/.agents/skills/data-pipeline
# 编写 your-project/.agents/skills/data-pipeline/SKILL.md
```

这些技能仅在该项目中可用。

### 技能编写技巧

- **具体明确** — 模糊的指令会导致不一致的结果
- **包含示例** — 向 AI 展示好的输出是什么样的
- **定义范围** — 告诉 AI 何时使用此技能，以及何时不使用
- **保持聚焦** — 一个技能 = 一个工作流。复杂任务拆分为多个技能

---

## 3. 市场系统

市场系统让你可以从 Git 仓库分发和安装技能。任何包含 `marketplace.json` 清单文件的 Git 仓库都可以作为市场。

### 创建市场

#### 第一步：准备仓库

```
my-marketplace/
  marketplace.json        # 必需：清单文件
  skills/
    rice-analysis/
      SKILL.md
    soil-report/
      SKILL.md
    weather-viz/
      SKILL.md
```

#### 第二步：编写 marketplace.json

```json
{
  "name": "agri-skills",
  "description": "面向农业研究的 CropCode 技能集",
  "plugins": [
    {
      "name": "rice-analysis",
      "description": "水稻产量数据分析与方差分析",
      "path": "skills/rice-analysis"
    },
    {
      "name": "soil-report",
      "description": "土壤养分分析与报告",
      "path": "skills/soil-report"
    },
    {
      "name": "weather-viz",
      "description": "气象数据可视化",
      "path": "skills/weather-viz"
    }
  ]
}
```

#### 第三步：推送到 GitHub

```bash
cd my-marketplace
git init
git add .
git commit -m "Initial marketplace"
git remote add origin https://github.com/yourname/agri-skills.git
git push -u origin main
```

### 从市场安装

```bash
# 1. 注册市场
cropcode marketplace add https://github.com/yourname/agri-skills.git

# 2. 浏览可用插件
cropcode marketplace list

# 3. 安装插件
cropcode plugin install rice-analysis@agri-skills

# 4. 验证安装
cropcode plugin list
```

### 管理市场

```bash
# 列出所有已注册市场
cropcode marketplace list

# 移除市场（同时卸载其插件）
cropcode marketplace remove agri-skills
```

### 管理插件

```bash
# 列出已安装插件
cropcode plugin list

# 安装指定插件
cropcode plugin install <插件名>@<市场名>

# 移除插件
cropcode plugin remove <插件名>
```

### 使用本地目录

你也可以使用本地目录作为市场——适合开发或私有技能：

```bash
# 绝对路径
cropcode marketplace add /path/to/my-marketplace

# 相对路径
cropcode marketplace add ./my-marketplace

# Home 目录
cropcode marketplace add ~/my-marketplace
```

### 使用指定分支

```bash
cropcode marketplace add https://github.com/yourname/agri-skills.git --ref develop
```

---

## 4. 社区技能中心

CropCode 的技能生态是开放的——任何人都可以创建和分享技能。以下是发现社区技能的方式：

### GitHub 搜索

在 GitHub 上搜索 CropCode 技能：

```
"marketplace.json" "plugins" cropcode
```

或搜索特定主题的技能：

```
SKILL.md "name:" "description:" path:skills
```

### Nature Skills（示例）

一个精选的农业与环境科学技能集合：

```bash
# 注册市场
cropcode marketplace add https://github.com/Yuan1z0825/nature-skills.git

# 浏览可用技能
cropcode marketplace list

# 安装需要的技能
cropcode plugin install <技能名>@nature-skills
```

### 创建团队技能中心

组织可以维护内部技能中心：

1. 创建私有 Git 仓库
2. 添加 `marketplace.json` 和精选技能
3. 团队成员注册为市场
4. 技能受版本控制，可共享

```bash
# 团队成员设置
cropcode marketplace add https://github.com/your-org/cropcode-skills.git
cropcode plugin install rice-protocol@cropcode-skills
```

---

## 5. TUI 命令

在 CropCode 交互会话中：

| 命令 | 说明 |
|------|------|
| `/` | 打开斜杠命令菜单——显示所有技能和内置命令 |
| `/skills` | 浏览并选择可用技能 |
| `/marketplace` | 查看已注册市场和可用插件 |
| `/plugin` | 查看已安装插件 |

---

## 6. 数据存储

| 内容 | 位置 |
|------|------|
| 用户技能 | `~/.agents/skills/*/SKILL.md` |
| 项目技能 | `<项目>/.agents/skills/*/SKILL.md` |
| 配置文件 | `~/.cropcode/settings.json` |
| 市场注册表 | `~/.cropcode/settings.json`（marketplaces 部分） |
| 已安装插件缓存 | `~/.cropcode/plugins/cache/` |
| 插件技能（链接） | `~/.agents/skills/`（从缓存链接） |

---

## 7. 安全机制

- **路径遍历防护** — 插件源不能逃逸市场目录
- **符号链接安全** — 插件安装时跳过符号链接
- **所有权检查** — 卸载时仅移除插件自身的文件
- **本地路径验证** — 绝对路径和相对路径均经过解析和验证

---

## 8. 常见问题

**Q: 可以使用来自 Claude Code 或其他 AI 编码工具的技能吗？**

可以。任何遵循上述格式的 `SKILL.md` 文件都能使用。技能系统基于 Markdown，可移植。

**Q: 使用技能必须有市场吗？**

不是。你可以直接在 `~/.agents/skills/` 或 `<项目>/.agents/skills/` 中手动创建技能。市场只是分发和安装技能的便捷方式。

**Q: 可以在不删除的情况下禁用技能吗？**

可以。在配置中将技能名称添加到 `disabledSkills`：

```json
{
  "disabledSkills": ["不需要的技能"]
}
```

**Q: 市场可以包含非技能文件吗？**

可以。市场只是一个带有 `marketplace.json` 的 Git 仓库。你可以在技能旁边放文档、脚本、数据文件等任何内容。

**Q: 如何更新插件？**

移除后重新安装：

```bash
cropcode plugin remove <名称>
cropcode plugin install <名称>@<市场>
```

或重新注册市场以获取最新版本：

```bash
cropcode marketplace remove <名称>
cropcode marketplace add <url>
cropcode plugin install <名称>@<市场>
```
