# 安装、更新与卸载

[返回首页](../README.md) · [English](installation_en.md)

从 **1.1.0** 开始，CropCode 提供两条独立安装路径。模型调用都需要你自己的 API Key。

| 方式 | 预先需要 | 安装内容 |
| --- | --- | --- |
| curl / PowerShell 独立安装 | 系统自带工具；Unix 需要 curl、tar、sha256sum 或 shasum | CropCode、私有 Node.js/npm 运行环境、对应架构的图片处理依赖 |
| npm 安装 | Node.js 22+、npm | CLI 包及 npm 获取的平台依赖，使用系统 Node.js |

## 无 Node.js 的一键安装

### macOS / Linux / WSL

```bash
curl -fsSL https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.sh | sh
```

安装器通过系统与 CPU 架构选择平台包，验证 `SHA256SUMS`，试运行新 CLI，再切换命令入口。无需 `sudo`，不会安装或替换系统 Node.js，也不会自动改写 Shell 启动文件。

默认布局：

```text
~/.local/bin/cropcode                    命令入口
~/.local/share/cropcode/current          当前安装版本的链接
~/.local/share/cropcode/releases/        已安装的版本及其私有运行环境
~/.local/share/cropcode/uninstall.sh     本地卸载器
```

如果终端提示找不到命令，把以下内容加入 `~/.zshrc` 或 `~/.bashrc`，然后重新打开终端：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

固定版本、自定义前缀：

```bash
curl -fsSL https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.sh | sh -s -- 1.1.0
curl -fsSL https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.sh | sh -s -- --prefix "$HOME/apps/cropcode"
```

自定义前缀中也会创建 `bin` 和 `share/cropcode`，按输出设置对应 PATH。支持 `CROPCODE_INSTALL_PREFIX` 环境变量，`--prefix` 优先。

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.ps1 | iex
```

默认安装到 `%LOCALAPPDATA%\CropCode`。按提示将 `%LOCALAPPDATA%\CropCode\bin` 加入**用户 PATH**，重新打开终端后执行 `cropcode`。脚本会打印仅对当前 PowerShell 生效的 PATH 命令，方便立即使用。

指定版本与安装目录：

```powershell
$installer = irm https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.ps1
& ([scriptblock]::Create($installer)) -Version 1.1.0 -Prefix "$env:LOCALAPPDATA\CropCode"
```

运行 CropCode 本身无需预装 Node.js。原生 Windows 中执行 Shell 工具仍需要 Git for Windows 的 Bash；Python/R、作物模型或其他科研工具也需要在实际项目中准备。WSL2 内使用 Linux 安装命令和 Linux 数据目录。

## 平台范围与发布保障

| 系统 | 架构 | 独立包 | 发布验证环境 |
| --- | --- | --- | --- |
| macOS 13.5+ | Apple Silicon / ARM64 | `darwin-arm64.tar.gz` | macOS 14 ARM64 |
| macOS 13.5+ | Intel / x64 | `darwin-x64.tar.gz` | macOS 15 Intel |
| Linux，glibc 2.28+、内核 4.18+ | x64 | `linux-x64.tar.gz` | Ubuntu 24.04 x64 |
| Linux，glibc 2.28+、内核 4.18+ | ARM64 | `linux-arm64.tar.gz` | Ubuntu 24.04 ARM64 |
| Windows 10+ | x64 | `win32-x64.zip` | Windows Server 2025 x64 |
| Windows 10+ | ARM64 | `win32-arm64.zip` | Windows 11 ARM64 |

完整文件名带版本，例如 `cropcode-1.1.0-darwin-arm64.tar.gz`。最低运行环境依据所附 [Node.js 24 平台要求](https://github.com/nodejs/node/blob/v24.21.0/BUILDING.md#platform-list)，并不表示每一种历史系统版本都已实机验证。Alpine/musl 与 32 位系统暂不提供独立包。

CI 在六种原生架构上构建并验证，安装测试从 PATH 移除系统 Node.js，再检查启动、真实图片处理、失败更新保持旧入口、成功更新及卸载。只有整个矩阵通过且所有平台包齐全，发布作业才创建 Release。运行环境版本和 SHA-256 固定在[平台清单](../scripts/standalone/platforms.json)。

## npm 安装与本地开发

有 Node.js 22+ 和 npm 时，可以直接安装 GitHub Release 包：

```bash
npm install -g https://github.com/YuanyuanMa03/cropcode/releases/download/v1.1.0/cropcode-cli-1.1.0.tgz
cropcode --version
```

npm 使用自己的全局前缀（`npm prefix -g`），与独立安装目录分开。安装来源是 GitHub `.tgz`，无需假定 npm registry 已发布同名版本。

开发者可以链接当前源码：

```bash
git clone https://github.com/YuanyuanMa03/cropcode.git
cd cropcode
npm ci
npm run link:local
```

最后一步等价于 `npm run build` 再运行 `npm link --workspace=@yuanyuanma03/cropcode-cli`。根包没有 CLI 入口，因此不能只在根目录执行裸 `npm link`。修改源码后构建并重启，保留源码目录。

macOS/Linux 上若默认全局前缀不可写：

```bash
npm_config_prefix="$HOME/.local" npm link --workspace=@yuanyuanma03/cropcode-cli
```

这里使用环境变量，因为 `npm link --prefix` 会改变工作区查找位置。若命令位置已被另一安装方式占用，先按其安装方式卸载，不使用 `--force` 覆盖。

## 更新与切换安装方式

独立安装版不显示 npm 更新提示；请通过原安装脚本更新，以同时替换程序和私有运行环境。

- **独立安装：** 重跑 curl / PowerShell 命令获取最新稳定版，或指定版本。下载、校验或启动验证失败不会切换到新包。旧包保留至卸载，避免破坏正在运行的会话；更新前可先退出旧会话。
- **npm 安装：** 对新版本 `.tgz` 执行 `npm install -g`。GitHub Release 包不通过 `npm update` 更新。
- **本地链接：** 更新源码后运行 `npm ci` / `npm run build`，重新启动命令。
- **从早期 curl 脚本迁移：** 旧脚本实质上是安装到 `~/.local` 的 npm 包。先执行 `npm uninstall -g --prefix "$HOME/.local" @yuanyuanma03/cropcode-cli`，再运行新脚本。配置和会话会保留。

macOS/Linux 用 `command -v cropcode`，PowerShell 用 `Get-Command cropcode` 检查实际入口。若多个目录中都存在命令，按 PATH 顺序选择。

## 卸载

卸载前退出所有 CropCode 会话，尤其在 Windows 上，运行中的文件可能被系统锁定。

### curl 独立安装

```bash
sh "$HOME/.local/share/cropcode/uninstall.sh"
```

自定义过前缀时，传入相同前缀：

```bash
sh "$HOME/apps/cropcode/share/cropcode/uninstall.sh" --prefix "$HOME/apps/cropcode"
```

卸载器删除它管理的命令链接、所有已安装版本和私有运行环境，不删除共享的 `~/.local/bin`，不会删除其他安装方式的命令。可以保留共享 PATH 条目；如果添加了专用目录的 PATH 条目，可自行从 Shell 配置中移除。

### Windows 独立安装

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\CropCode\uninstall.ps1"
```

自定义目录示例：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Apps\CropCode\uninstall.ps1" -Prefix "D:\Apps\CropCode"
```

删除程序、历史版本、运行环境后，从用户 PATH 中移除对应 `bin` 条目。以上 ExecutionPolicy 仅作用于本次卸载进程，不修改系统策略。

### npm / 本地开发链接

```bash
npm uninstall -g @yuanyuanma03/cropcode-cli
```

若安装或链接时指定了前缀，使用相同前缀：

```bash
npm uninstall -g --prefix "$HOME/.local" @yuanyuanma03/cropcode-cli
```

**以上卸载方式都保留 `~/.cropcode` 的凭证、配置和会话，以及项目源码与数据。** 解除开发链接不会删除源码目录。独立安装与 npm 安装需要分别卸载，不要用 npm 命令删除独立安装目录。
