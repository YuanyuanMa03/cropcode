# Install, update, and uninstall

[Homepage](../README-en.md) · [中文](installation.md)

Starting with **1.1.0**, choose standalone installation without system Node.js, or npm installation with Node.js 22+. Both require your own model-provider API key.

## Standalone installation

### macOS / Linux / WSL

```bash
curl -fsSL https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.sh | sh
```

Requires curl, tar, and sha256sum or shasum. The bundle includes a private Node.js/npm runtime and native dependencies. No sudo, global Node.js replacement, or shell profile edits occur.

Files live in `~/.local/share/cropcode/releases/`, selected by its `current` link. The command is `~/.local/bin/cropcode`. If needed, add this to your shell profile and reopen the terminal:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Pin a version or choose a prefix:

```bash
curl -fsSL https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.sh | sh -s -- 1.1.0
curl -fsSL https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.sh | sh -s -- --prefix "$HOME/apps/cropcode"
```

A custom prefix contains `bin` and `share/cropcode`; follow the printed PATH instructions. `--prefix` overrides `CROPCODE_INSTALL_PREFIX`.

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.ps1 | iex
```

The default directory is `%LOCALAPPDATA%\CropCode`. Add its `bin` directory to **user PATH** as instructed, then reopen the terminal. The installer also prints a PATH command for the current PowerShell session.

```powershell
$installer = irm https://raw.githubusercontent.com/YuanyuanMa03/cropcode/main/install.ps1
& ([scriptblock]::Create($installer)) -Version 1.1.0 -Prefix "$env:LOCALAPPDATA\CropCode"
```

No system Node.js is required to run CropCode. Shell tools on native Windows still require Git for Windows Bash; Python/R and other research tools must be supplied by your project. Inside WSL2, use the Linux installer.

## Platforms and release checks

| System | Architecture | Bundle suffix | Release verification runner |
| --- | --- | --- | --- |
| macOS 13.5+ | Apple Silicon / ARM64 | `darwin-arm64.tar.gz` | macOS 14 ARM64 |
| macOS 13.5+ | Intel / x64 | `darwin-x64.tar.gz` | macOS 15 Intel |
| Linux, glibc 2.28+, kernel 4.18+ | x64 | `linux-x64.tar.gz` | Ubuntu 24.04 x64 |
| Linux, glibc 2.28+, kernel 4.18+ | ARM64 | `linux-arm64.tar.gz` | Ubuntu 24.04 ARM64 |
| Windows 10+ | x64 | `win32-x64.zip` | Windows Server 2025 x64 |
| Windows 10+ | ARM64 | `win32-arm64.zip` | Windows 11 ARM64 |

Example full asset name: `cropcode-1.1.0-darwin-arm64.tar.gz`. Minimum platform requirements follow the bundled [Node.js 24 runtime](https://github.com/nodejs/node/blob/v24.21.0/BUILDING.md#platform-list); they do not imply testing on every historical OS version. Alpine/musl and 32-bit standalone builds are not provided.

CI builds on all six native targets. Installation verification removes system Node.js from PATH, then tests startup, real image processing, failed-update preservation, successful updates, and uninstall. A release is published only after every target passes and all assets are present. Runtime versions and hashes are pinned in the [platform manifest](../scripts/standalone/platforms.json).

## npm and local development

With Node.js 22+ and npm:

```bash
npm install -g https://github.com/YuanyuanMa03/cropcode/releases/download/v1.1.0/cropcode-cli-1.1.0.tgz
cropcode --version
```

This uses npm's global prefix (`npm prefix -g`) and fetches platform dependencies. The source is a GitHub Release tarball; installation does not assume registry publication.

For local development:

```bash
git clone https://github.com/YuanyuanMa03/cropcode.git
cd cropcode
npm ci
npm run link:local
```

This builds and runs `npm link --workspace=@yuanyuanma03/cropcode-cli`. The repository root has no CLI binary, so do not run bare `npm link` there. Rebuild after edits, restart CropCode, and retain the source directory.

For a user-owned prefix on macOS/Linux:

```bash
npm_config_prefix="$HOME/.local" npm link --workspace=@yuanyuanma03/cropcode-cli
```

Use the environment variable because `npm link --prefix` changes workspace lookup. If another installation owns the command, uninstall it using its original method before linking; do not overwrite it with `--force`.

## Updates and migration

Standalone installations skip npm update prompts. Use the original installer to update both the application and its private runtime.

- **Standalone:** rerun the curl/PowerShell installer, optionally pinning a version. It verifies checksums and tests the new CLI before switching the entry point. Download, checksum, or startup failures preserve the previous entry point. Older bundles remain until uninstall to avoid disrupting running sessions.
- **npm:** install the new release `.tgz` with `npm install -g`. `npm update` is not the update path for GitHub tarballs.
- **Local link:** update source, run `npm ci` / `npm run build`, and restart.
- **Earlier curl installer:** it installed an npm package under `~/.local`. First run `npm uninstall -g --prefix "$HOME/.local" @yuanyuanma03/cropcode-cli`, then use the standalone installer. Settings and sessions remain intact.

Inspect `command -v cropcode` on macOS/Linux or `Get-Command cropcode` in PowerShell when multiple installations coexist. PATH order selects the command.

## Uninstall

Close all CropCode sessions first, particularly on Windows where running executables may be locked.

**Standalone curl installation:**

```bash
sh "$HOME/.local/share/cropcode/uninstall.sh"
```

For a custom prefix:

```bash
sh "$HOME/apps/cropcode/share/cropcode/uninstall.sh" --prefix "$HOME/apps/cropcode"
```

This removes the managed command link, installed versions, and private runtime. It retains the shared `~/.local/bin` directory and does not remove commands owned by other installations. Remove a custom PATH entry yourself if it is no longer needed.

**Windows standalone:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\CropCode\uninstall.ps1"
```

Custom directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Apps\CropCode\uninstall.ps1" -Prefix "D:\Apps\CropCode"
```

Remove the matching `bin` directory from user PATH afterward. The ExecutionPolicy option applies only to this uninstall process; it does not alter system policy.

**npm installation or local development link:**

```bash
npm uninstall -g @yuanyuanma03/cropcode-cli
```

Supply the original prefix if customized:

```bash
npm uninstall -g --prefix "$HOME/.local" @yuanyuanma03/cropcode-cli
```

All methods preserve `~/.cropcode` credentials, configuration, sessions, and project files. Unlinking does not delete source. Standalone and npm installations must be removed separately.
