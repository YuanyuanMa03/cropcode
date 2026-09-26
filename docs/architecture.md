# CropCode 架构

CropCode 使用 TypeScript 与 npm workspaces，包含 core、CLI、VSCode 与 Desktop 工作区。

- `packages/core/src/session.ts`：会话、流式生成、工具调用、压缩、检查点和会话恢复。
- `packages/core/src/settings.ts`：环境变量、项目设置、用户设置及登录凭证的解析。
- `packages/core/src/common/provider-presets.ts` 与 `openai-thinking.ts`：供应商配置和协议适配。
- `packages/core/src/prompt.ts`：农业科研提示词与工具声明。
- `packages/core/src/tools/`：文件、Shell、搜索、原生图片输入、计划及用户交互工具。
- `packages/core/src/mcp/`：外部 MCP 工具接入。
- `packages/cli/src/ui/`：绿色终端界面、供应商登录、模型菜单和会话交互。
- `packages/cli/src/web/server.ts` 与 `packages/cli/resources/web/`：仅监听本机的 Web 主机及无构建任务工作台；任务搜索与项目文件引用复用既有会话与文件检索接口。
- `apps/desktop/`：Electron 薄壳，启动同一 Web 主机并加载同一界面；只负责原生窗口与服务生命周期。沙箱预加载脚本以 CommonJS 编译，仅暴露桌面标记和平台名称，不开放 Node 或文件系统权限。
- `packages/vscode-ide-companion/`：共享 core 的 VSCode 界面。
- `apps/web/` 与 `packages/ui/`：三端升级的独立 React/Vite 设计预览，仅使用演示数据，尚未接入 core 或当前桌面发行包。启动与范围见[工作台预览](workbench-preview.md)。

模型请求发往用户配置的供应商。搜索使用自定义脚本或 DeepSeek 官方接口，图片理解需要多模态模型。不提供产品专属中转、付费平台、媒体生成服务或使用上报。

配置及会话保存在 `.cropcode` 目录；更高优先级配置的覆盖规则见[配置说明](configuration.md)。许可证信息见 [LICENSE](../LICENSE)。本文不包含未经实测的性能或基准成绩。
