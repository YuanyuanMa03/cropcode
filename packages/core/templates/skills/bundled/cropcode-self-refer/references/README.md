# CropCode

**面向农业科研的终端 AI 编程助手。**

CropCode 将自然语言任务连接到项目文件、Shell、模型和工具，协助完成田间数据分析、作物模型开发、遥感处理以及 Python/R 科研工作流，也适用于一般软件工程任务。

绿色终端界面 · 农业科研提示词 · 多供应商模型接入

[English](README-en.md) · [配置说明](docs/configuration.md) · [模型供应商](docs/providers.md) · [更新记录](CHANGELOG.md)

## 安装

需要 **Node.js 22 或更高版本**，使用 npm 安装发布包：

```bash
npm install -g https://github.com/YuanyuanMa03/cropcode/releases/download/v2.2.0/cropcode-cli-2.2.0.tgz
cropcode
```

也可以从 [GitHub Releases](https://github.com/YuanyuanMa03/cropcode/releases) 下载 `.tgz`，然后运行 `npm install -g ./cropcode-cli-2.2.0.tgz`。安装时需要联网获取当前系统对应的图片处理依赖。

从源码运行：

```bash
git clone https://github.com/YuanyuanMa03/cropcode.git
cd cropcode
npm ci
npm start
```

项目使用 npm workspaces 和 `package-lock.json`。

## 开始使用

没有配置 API Key 时，交互界面会引导你选择供应商、接入方式和模型，再输入密钥。已有 `~/.cropcode/settings.json` 配置的用户可以直接进入会话。

- `/login`：切换供应商和 API / 套餐接入方式。
- `/model`：选择模型、开关思考模式及调整支持的推理强度。
- `/plan` 或 `Shift+Tab`：进入规划模式，先讨论方案。
- `/new`、`/resume`、`/fork`：新建、恢复或分叉会话。
- `/undo`：恢复文件和/或对话检查点。
- `/skills`、`/mcp`：查看技能与外部工具。
- `/raw`：切换 Normal / Lite / Raw 显示。

例如：

> 先检查这个田间试验数据集的单位、缺失值和区组结构，再编写可复现的 R 分析脚本。不要改动原始数据；没有实际运行的统计结果不要填入报告。

可使用 `cropcode --help` 查看非交互执行选项，适合脚本和自动化任务。

## 模型供应商

内置 DeepSeek、智谱 GLM、通义千问、MiMo 小米和 LongCat 的接入配置。支持的供应商可选择 API 或 Coding / Token Plan 专用地址。

模型菜单会尝试从当前配置的 `/models` 接口读取可用模型；不支持此接口或请求失败时，仍可选择内置模型和当前模型。模型可用性、套餐限制与价格以供应商控制台为准。

配置优先级为 **`CROPCODE_*` 环境变量 → 项目配置 → 用户配置 → 已保存的登录凭证 → 默认值**。登录向导同步更新用户配置中的模型、地址和密钥；项目配置或环境变量仍可覆盖它。详见[模型接入说明](docs/providers.md)。

## 农业科研工作流

系统提示词要求核对单位、时间、坐标系、试验设计和重复观测，保留原始数据并记录分析过程。模拟数据必须标注，文献、实验结果和工具执行记录必须有依据。

CropCode 可以帮助编写和运行农业分析代码，但不会内置或凭空提供 DSSAT、APSIM、WOFOST、气象数据库或实验数据；这些资源需要在实际项目中配置。

## 核心能力

- 流式对话、请求重试、上下文压缩与会话持久化。
- 文件读写、片段编辑、Bash 前台/后台任务与中断处理。
- 按作用域配置权限、Plan Mode 和方案实施选择。
- Agent Skills 按需加载与 MCP 工具集成。
- 图片读取、模型多模态配置及可选 DeepSeek Files API。
- CLI 和 VSCode 扩展共享核心库。

联网搜索使用 `webSearchTool` 自定义脚本，或 DeepSeek 官方 API 连接下的内置搜索能力。图片理解使用当前配置的多模态模型。CropCode 不内置媒体生成服务，不发送使用上报，也不会读取其他产品的专属凭证。

## 开发

```bash
npm run check       # 类型、lint 和格式检查
npm test            # core / CLI / VSCode 测试
npm run build       # core + CLI
npm run build:vscode
npm run package:cli # 打包 CLI 到 release/
```

`packages/core` 管理会话与工具；`packages/cli` 提供终端界面；`packages/vscode-ide-companion` 提供编辑器界面。

## 许可与参考

本项目采用 MIT 许可证，包含第三方 MIT 许可代码。版权声明见 [LICENSE](LICENSE)，技术来源记录见 [docs/upstream.md](docs/upstream.md)。
