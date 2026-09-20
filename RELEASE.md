# 发布 CropCode

## GitHub Release

使用 Node.js 22 或 24 和 npm。在更新三个工作区版本并提交源代码之后打包，确保安装包记录正确的 Git 提交。

```bash
npm ci
npm run check
npm test
npm run package:cli
npm run build:vscode
```

CLI 产物在 `release/cropcode-cli-<version>.tgz`；扩展产物在 `packages/vscode-ide-companion/cropcode-vscode-<version>.vsix`。CLI 包需要 Node.js 22+，安装时会获取平台对应的 Sharp 依赖。

推送与 package.json 版本一致的 `v<version>` 标签，会触发 `.github/workflows/release.yml`。工作流重新检查、测试和打包，再创建 GitHub Release，附上 tgz、VSIX 和 SHA256SUMS。它不会发布到 npm 或 VS Code Marketplace。

2.2.0 的安装方式：

```bash
npm install -g https://github.com/YuanyuanMa03/cropcode/releases/download/v2.2.0/cropcode-cli-2.2.0.tgz
cropcode --version
```

旧版便携式安装脚本和压缩包不再生成。旧版安装如果占用了 `cropcode` 命令，请先按原安装方式卸载，再安装本版。

## 可选的市场发布

保留上游的 `npm run release:version -- <version>`、`npm run prepare:package -- <version>` 和 `npm run prepare:vscode -- <version>` 脚本，分别用于同步版本、向 npm 发布和向 VS Code Marketplace 发布。后两者会修改版本、提交和标签，应在干净的发布分支执行。

npm 发布需要有目标作用域权限的 npm 登录；VS Code Marketplace 发布需要属于当前 publisher 的 `VSCE_PAT`。GitHub Release 发布成功并不代表已经发布到这两个市场。
