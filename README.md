# CropCode

**让模型，回应田野的问题。**

CropCode 2.0 是面向作物模型科研的 AI 工作台。桌面和终端共用一套执行内核，围绕模型代码、参数、气象与土壤数据、观测和模拟结果开展工作。

- 项目与任务、流式对话、文件预览、终端、工具权限和会话记录。
- 用户自行配置供应商、端点与模型，支持 Anthropic Messages、Chat Completions 和 Responses。
- 无产品账号、套餐、首次引导、市场或遥测；默认不预选供应商。
- 中文界面，灰绿浅色与深色主题，功能名称直白。

## 使用

桌面在“设置 → 模型”中添加模型并打开项目。

终端运行 `cropcode` 打开交互界面。也可先配置模型，再执行单次任务：

```sh
cropcode configure --provider-name "研究模型" \
  --base-url "https://your-endpoint.example/v1" \
  --api-format openai-chat-completions --model-id your-model \
  --api-key-env MODEL_API_KEY --context-window 65536
cropcode --cwd /path/to/project --prompt "检查气象输入中的单位与缺测值"
```

`MODEL_API_KEY` 应由本机环境安全提供。两端共用 `~/.cropcode-desktop/v2/provider_config.json`，不自动迁入旧版数据。单次任务默认使用 build 权限模式；无需确认的 `--mode yolo` 必须显式指定。

## 本地构建

要求 Node 24.14.0、pnpm 10.33.2。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build:cli
pnpm prepare:desktop-runtime
pnpm build:desktop
pnpm check
pnpm test:product
```

安装依赖不自动运行第三方安装脚本；Electron 和原生运行时需按对应平台准备并验证。内部工作区名称是构建标识。架构见 [架构说明](docs/architecture.md)，当前验收和已知限制见 [升级记录](docs/desktop-renewal.md)。

版本号已统一为 **2.0.0**，当前产物处于本地验收阶段，尚未作为正式发行发布。版本号不代表签名、跨平台或真实模型验收已经完成。

[English](README-en.md) · [许可证](LICENSE) · [第三方声明](NOTICE.md)
