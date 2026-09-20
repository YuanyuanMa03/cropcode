<p align="center">
  <img src="docs/assets/cropcode-banner.svg" alt="CropCode — 面向农业科研的 AI 编程助手" width="100%">
</p>

<h1 align="center">CropCode 🌱</h1>

<p align="center">
  <strong>把田间问题，带进代码。让科研过程，有迹可循。</strong><br>
  面向农业科研的终端 AI 编程助手
</p>

<p align="center">
  <a href="https://github.com/YuanyuanMa03/cropcode/releases"><img src="https://img.shields.io/github/v/release/YuanyuanMa03/cropcode?color=37865b&amp;label=release" alt="GitHub release"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-22%2B-417e38" alt="Node.js 22 or later"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-c4a657" alt="MIT license"></a>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#一次任务如何完成">交互演示</a> ·
  <a href="docs/quickstart.md">使用指南</a> ·
  <a href="docs/providers.md">模型接入</a> ·
  <a href="README-en.md">English</a>
</p>

---

CropCode 在你的项目目录里工作：读取数据和代码、讨论分析方案、编写 Python/R 脚本、运行命令，并把执行过程呈现在终端中。从田间试验到遥感处理，从作物模型到日常开发，都可以从一句自然语言任务开始。

| 🌾 懂科研语境 | 🖥️ 在项目里动手 | 🔌 自由选择模型 |
| --- | --- | --- |
| 农业领域提示词关注单位、试验设计、数据来源与可复现性 | 绿色终端界面，直接读写文件、执行命令、查看工具输出 | 内置 DeepSeek、智谱 GLM、通义千问、MiMo、LongCat 接入配置 |

## 看看它如何工作

<a href="docs/assets/cropcode-terminal.png">
  <img src="docs/assets/cropcode-terminal.png" alt="CropCode 实机截图：绿色欢迎界面、GLM 模型配置，以及加载自我介绍技能并读取文档的过程" width="100%">
</a>

<p align="center"><sub>实机截图 · 欢迎界面与自我介绍过程 · 点击查看 3840 × 2160 原图</sub></p>

这张截图展示了一个具体过程：**输入问题 → 加载 `cropcode-self-refer` 技能 → 读取随包文档 → 开始回答**。欢迎面板显示当前供应商、模型、思考设置和工作目录。背景壁纸与透明效果来自截图中的终端配置。

## 快速开始

需要 **Node.js 22+**，以及所选模型服务的 API Key。

```bash
npm install -g https://github.com/YuanyuanMa03/cropcode/releases/download/v2.2.0/cropcode-cli-2.2.0.tgz

# 进入你的项目目录后启动
cropcode
```

没有配置 API Key 时，会出现登录向导。按顺序选择 **供应商 → 接入方式 → 模型 → 输入密钥**，即可开始会话。已有配置会直接使用；以后可通过 `/login` 重新选择供应商。

> **版本说明：** 上面的命令安装已发布的 **2.2.0**。本页功能说明对应当前 `main`，发布后的调整见[更新记录](CHANGELOG.md)。体验最新源码请使用下方命令。安装发布包时需要联网获取当前系统对应的图片处理依赖。

<details>
<summary><strong>从源码运行 / 安装本地发布包</strong></summary>

从当前源码运行（项目使用 npm workspaces 与 `package-lock.json`）：

```bash
git clone https://github.com/YuanyuanMa03/cropcode.git
cd cropcode
npm ci
npm start
```

也可以从 [GitHub Releases](https://github.com/YuanyuanMa03/cropcode/releases) 下载 `.tgz` 后安装：

```bash
npm install -g ./cropcode-cli-2.2.0.tgz
cropcode --version
```

</details>

## 一次任务如何完成

以“分析田间试验数据”为例，下面是可以照着操作的交互流程。**提示词和文件名是使用示例，需替换成你的真实数据；不是已完成的实验结果。**

```text
进入项目 → 选择模型 → 讨论方案 → 确认执行 → 查看文件与运行结果
                         ↑                       │
                         └──── 补充条件，继续迭代 ──┘
```

**① 把任务与数据一起交给它**

在输入框中使用 `@` 引用文件，也可以直接描述项目中的数据位置：

```text
检查 @data/field_trial.csv 的字段、缺失值、产量单位与区组结构。
先列出需要我确认的问题，不要修改原始数据，也不要推测缺失的单位。
```

**② 先讨论分析方案**

输入 `/plan` 或按 `Shift+Tab` 进入规划模式，再说明目标：

```text
根据刚才核实的试验设计，规划一套 R 分析流程。
说明模型选择依据、诊断方法、图表和输出文件，先不要实施。
```

**③ 确认后开始实施**

完整方案输出后，界面会出现 `Plan ready` 选择框。选择 **`implement this plan`** 开始执行；还想调整时，选择 **`stay in Plan mode`**。执行过程中可以查看文件读取、编辑与命令输出；权限规则要求确认时，界面会显示相应提示。

**④ 用实际产物验收，再继续迭代**

```text
运行分析脚本，并汇总输出文件、实际运行命令和检查结果。
原始数据保持不变；依赖缺失、运行失败或尚未验证的部分请明确列出。
```

检查生成的脚本、表格和图像后，可继续要求修改。按 `Esc` 中断当前生成；下次通过 `/resume` 继续会话，或用 `/undo` 选择恢复文件和/或对话检查点。

[查看完整操作指南 →](docs/quickstart.md)

## 带着你的研究问题开始

以下是任务示例；执行需要你提供真实数据、相应运行环境和必要的外部工具。

| 场景 | 可以交给 CropCode 的任务 | 可要求交付的产物 |
| --- | --- | --- |
| **田间试验与统计** | 核查缺失值、重复观测和区组结构，编写与试验设计匹配的分析代码 | 数据检查清单、R/Python 脚本、统计表 |
| **遥感与空间分析** | 检查波段、坐标系、缩放系数与云掩膜，编写植被指数及区域统计流程 | 批处理脚本、栅格结果、质量检查记录 |
| **作物模型与参数分析** | 整理模型输入、编写批量运行与参数敏感性分析脚本 | 输入检查脚本、运行配置、结果比较图 |
| **科研绘图与复现** | 按指定单位、分组和图例绘图，整理环境依赖与运行步骤 | 绘图代码、图像文件、复现说明 |
| **日常软件开发** | 阅读仓库、定位问题、修改代码并运行相关测试 | 代码改动、测试输出、变更说明 |

<details>
<summary><strong>展开：两段可直接修改使用的科研提示词</strong></summary>

**遥感数据处理**

```text
检查 imagery/ 中的影像元数据，确认波段含义、坐标系和缩放系数。
如果缺少云掩膜或必要元数据，先告诉我。
编写 Python 脚本计算 NDVI，保留无效值掩膜，并记录输入文件和处理参数。
```

**科研图表复现**

```text
读取 results/ 中实际存在的结果文件，用 ggplot2 绘制处理组比较图。
误差线的定义先与我确认，不从汇总均值反推原始重复。
将绘图脚本、图像与运行步骤分别保存，列出本次实际执行的命令。
```

</details>

农业科研提示词要求核对数据来源、单位、时间、坐标系和试验设计，标注模拟数据，避免编造文献与实验结果。这些是对模型的工作要求，科学结论仍需结合数据与方法审查。DSSAT、APSIM、WOFOST、气象数据库及实验数据需要在实际项目中提供。

## 用得顺手，也能接着做

| 能力 | 在工作中怎么用 |
| --- | --- |
| **文件与 Shell 工具** | 在当前项目中读取、创建和编辑文件，运行前台或后台命令 |
| **Plan Mode 与权限** | 先讨论方案，再选择实施；按作用域配置允许、询问或拒绝的操作 |
| **会话与检查点** | 用 `/resume` 接着做、`/fork` 分叉讨论、`/undo` 恢复已跟踪文件或对话 |
| **Skills 与项目说明** | 将重复流程整理成技能，通过 `/init` 生成项目说明，用 `/skills` 查看可用技能 |
| **MCP 外部工具** | 配置外部工具服务，再用 `/mcp` 检查连接与工具列表 |
| **长任务与自动化** | 流式输出、请求重试、上下文压缩，以及非交互单次执行 |
| **图片与编辑器** | 配置多模态模型读取图片；仓库同时提供共享核心库的 VSCode 扩展 |

常用入口：`/login` 选供应商 · `/model` 选模型与思考设置 · `/plan` 规划 · `/new` 新会话 · `/raw` 调整显示 · `/exit` 退出。

脚本或自动化任务可使用：

```bash
cropcode --exec --prompt "总结当前项目的目录结构与测试入口，不修改文件。"
cropcode --help
```

非交互模式不能回答追问或权限确认；需要交互时，应回到终端会话处理。联网搜索使用配置的 `webSearchTool` 脚本，或 DeepSeek 官方 API 连接下的内置搜索能力；图片理解取决于当前模型的多模态支持。

## 模型由你选择

内置接入配置覆盖以下五家供应商，也可以在配置文件中设置兼容的 API 地址与模型 ID。

| 供应商 | 客户端内置接入方式 |
| --- | --- |
| DeepSeek | API |
| 智谱 GLM | API / Coding Plan |
| 通义千问 Qwen | API / Coding Plan |
| MiMo 小米 | API / Token Plan |
| LongCat | API |

`/login` 管理供应商与接入方式；`/model` 调整模型、思考开关及支持的推理强度。模型列表会尝试从当前连接的 `/models` 接口获取，失败时保留预设与当前模型。实际可用模型、套餐权限和价格以供应商账户为准。

配置优先级：**`CROPCODE_*` 环境变量 → 项目配置 → 用户配置 → 登录凭证 → 默认值**。切换后配置未生效时，先检查更高优先级的覆盖项。[接入与配置详情 →](docs/providers.md)

## 文档导航

| 我想…… | 从这里开始 |
| --- | --- |
| 完成第一次交互、查快捷键与命令 | [使用指南](docs/quickstart.md) |
| 设置模型、图片支持与搜索 | [配置说明](docs/configuration.md) · [模型供应商](docs/providers.md) |
| 先规划，再执行 | [Plan Mode](docs/plan-mode.md) |
| 调整文件与命令执行权限 | [权限配置](docs/permission.md) |
| 恢复会话、分叉与撤销 | [会话与检查点](docs/session-persistence.md) |
| 保存项目约定、复用工作流、接外部工具 | [AGENTS.md](docs/agents-md.md) · [Skills](docs/agent-skills.md) · [MCP](docs/mcp.md) |
| 了解代码结构或版本变化 | [架构说明](docs/architecture.md) · [更新记录](CHANGELOG.md) |

## 参与开发

```bash
npm ci
npm run check        # 类型、lint 和格式检查
npm test             # core / CLI / VSCode 测试
npm run build        # core + CLI
npm run build:vscode # VSCode 扩展
npm run package:cli  # CLI 发布包，输出到 release/
```

`packages/core` 管理会话与工具，`packages/cli` 提供终端界面，`packages/vscode-ide-companion` 提供编辑器界面。欢迎通过 [Issues](https://github.com/YuanyuanMa03/cropcode/issues) 提交问题与建议；报告问题时请附版本、运行环境、复现步骤及脱敏后的输出。

## 许可证

采用 [MIT 许可证](LICENSE)，包含第三方 MIT 许可代码。必要版权声明予以保留，技术来源记录见 [docs/upstream.md](docs/upstream.md)。
