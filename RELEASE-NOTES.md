# CropCode 1.1.0

`1.1.0` 是 CropCode 新发布序列的首个稳定版本。

## 主要能力

- 在终端中读取与编辑项目文件、运行命令、调用模型并展示工具过程。
- 支持 Plan Mode、会话恢复与分叉、检查点撤销、权限规则、Skills 和 MCP。
- 提供面向农业科研的数据来源、单位、试验设计与可复现性工作约束。
- 支持 DeepSeek、智谱 GLM、通义千问、MiMo、LongCat，以及兼容的自定义 API 地址。
- 提供仅监听本机地址的 `cropcode web` 浏览器工作台。
- 提供共享核心库的 VSCode companion 源码与构建入口。

## 安装方式

- macOS / Linux / WSL：`install.sh`
- Windows PowerShell：`install.ps1`
- Node.js 22+ 环境：GitHub Release 中的 npm `.tgz`
- 本地开发：`npm ci && npm run link:local`

独立安装包覆盖 macOS、Linux、Windows 的 x64 / ARM64 目标，并附带 SHA-256 校验值。具体平台范围、更新和卸载步骤见[安装指南](https://github.com/YuanyuanMa03/cropcode/blob/v1.1.0/docs/installation.md)。

## 验证要求

发布前必须通过类型检查、lint、格式检查、自动化测试、项目构建、CLI 打包和独立安装验证。只有所有平台产物齐全且校验成功时才创建 GitHub Release。
