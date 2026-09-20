# Publishing CropCode

See [the release guide](RELEASE.md). Tagged releases run checks, tests and builds, then publish the CLI tarball, VSIX and SHA256SUMS on GitHub. They do not publish to npm or VS Code Marketplace.

Use Node.js 22 or 24 and npm. Run `npm run package:cli` and `npm run build:vscode` from the committed source. CLI tarballs require Node.js 22+ and install the platform-specific Sharp dependency through npm.

Optional upstream publishing scripts remain available but require the appropriate npm or Marketplace credentials.
