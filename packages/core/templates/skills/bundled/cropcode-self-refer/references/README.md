# CropCode

**面向农业科研的终端 AI 编程助手。**

CropCode 将自然语言任务连接到项目文件、Shell、模型和工具，协助完成田间数据分析、作物模型开发、遥感处理以及 Python/R 科研工作流，也适用于一般软件工程任务。

绿色终端界面 · 农业科研提示词 · 多供应商模型接入

[English](README-en.md) · [配置说明](docs/configuration.md) · [模型供应商](docs/providers.md) · [更新记录](CHANGELOG.md)

## 安装与卸载

1.1.0 提供独立安装包，无需系统 Node.js。macOS / Linux / WSL：

```bash
curl -fsSL https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.ps1 | iex
```

独立包内含私有运行环境和平台依赖，macOS/Linux 默认安装到 `~/.local/share/cropcode`，命令在 `~/.local/bin`；Windows 默认 `%LOCALAPPDATA%\CropCode`，命令在其 `bin` 目录。按提示设置 PATH。支持 x64/ARM64 的 macOS 13.5+、glibc 2.28+ Linux、Windows 10+。原生 Windows Shell 工具需要 Git for Windows Bash。

已有 Node.js 22+ 与 npm 时，也可以安装 Release 包：

```bash
npm install -g https://github.com/YuanyuanMa03/cropcode/releases/download/v1.1.0/cropcode-cli-1.1.0.tgz
```

独立包重跑安装脚本即可更新，校验与启动失败不切换新版本；npm 安装需要对新版本的 `.tgz` 重新执行安装。卸载独立版：

```bash
sh "$HOME/.local/share/cropcode/uninstall.sh"
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\CropCode\uninstall.ps1"
```

自定义前缀时，卸载器需传入相同 `--prefix` / `-Prefix`。npm 安装或默认全局目录的开发链接用 `npm uninstall -g @yuanyuanma03/cropcode-cli`；早期 npm 包装式 curl 安装加 `--prefix "$HOME/.local"`。先退出正在运行的会话，卸载保留 `~/.cropcode` 配置、会话与项目。

本地开发：仓库根目录执行 `npm ci` 和 `npm run link:local`，后者构建并执行 `npm link --workspace=@yuanyuanma03/cropcode-cli`。修改后重建并重启；不要只在根目录执行裸 `npm link`，不要删除被链接的源码目录。

完整安装、迁移与卸载说明见 https://github.com/YuanyuanMa03/cropcode/blob/main/docs/installation.md 。

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

配置优先级为 **`CROPCODE_*` 环境变量 → 项目配置 → 用户配置 → 已保存的登录凭证 → 默认值**。登录向导同时更新用户配置中的模型、地址和密钥；项目配置或环境变量仍可覆盖它。详见[模型接入说明](docs/providers.md)。

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

本项目采用 MIT 许可证，包含第三方 MIT 许可代码，必要版权声明见 [LICENSE](LICENSE)。
