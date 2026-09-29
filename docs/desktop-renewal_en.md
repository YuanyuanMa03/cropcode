# CropCode 2.0 renewal record

The goal is a usable research product with desktop and terminal interfaces sharing one kernel. The VSCode extension is no longer a deliverable. Versions are aligned to 2.0.0. A local build is not a stable release; status below follows actual evidence.

## Implemented

- Research workbench with light sage and dark themes, projects, tasks, files, terminals and changes. No onboarding, occupation survey, marketplace, subscription or remote workspace UI.
- Provider-neutral templates and custom endpoints, with no preconfigured provider instance. CLI configuration and desktop share provider storage.
- Terminal TUI, model selection, single-prompt tasks and session resume. Headless defaults to build mode; yolo requires an explicit flag.
- The standalone terminal archive assembles the Agent, Node and native modules directly, without an editor extension build.
- Product accounts, remote configuration, telemetry and automatic updates are disabled. Local runtimes and user-configured models, skills and MCP remain.
- Desktop main type errors, asynchronous index unsubscribe cleanup and duplicate settings IPC listeners were fixed.
- Versioning covers desktop and terminal. Licenses and third-party provenance are retained.

## Local acceptance

Environment: macOS arm64, Node 24.14.0, Electron 41.0.3. Test data and credential copies stay in isolated local directories outside source and packages.

- An earlier `pnpm check` passed shared, desktop main, CLI and then-current VSCode typing, lint and formatting. The current gate covers only shipped desktop and CLI targets. Inherited lint warnings remain.
- `pnpm test:product`: 8 passing checks for product endpoints, telemetry, identity, marketplace/plugin defaults, remote scenes, provider persistence and credential inputs.
- `pnpm test:kernel`: the built Agent uses a local model fixture and real tools to read CSV, compute daily degree days and write a file. Disk readback confirms 14, 16 and 12, totaling 42 degree-days; the raw CSV is unchanged. Session resume and plan-mode write refusal pass.
- The real TUI starts, displays CropCode, reads provider configuration and opens model selection.
- Earlier VSCode development-host testing covered task submission and tools; that historical result is outside the current delivery scope.
- The macOS DMG passes checksum verification. The app copied from the image starts independently with version 2.0.0 and identity org.cropcode.desktop, and historical tasks remain visible after restart. Denying a command leaves output content and modification time unchanged.
- An earlier VSIX passed isolated installation checks; it is no longer delivered. The terminal archive includes OpenTUI's dynamically loaded native FFI dependencies. A fresh extraction passes version and renderer initialization checks with bundled Node, and the local `cropcode` command launches the TUI without system Node.
- Earlier artifacts had SHA256SUMS; current delivery includes only desktop and terminal. The earlier terminal archive and VSIX scan did not find the test credential.
- Real desktop checks cover light/dark themes, narrow windows, editable research shortcuts, simplified settings and custom provider persistence.
- After removing six unreferenced UI dependencies, the rebuilt macOS arm64 `app.asar` is 278 MB and contains none of them. Its bundled Electron launched in Node mode; `pnpm check`, `pnpm test:product` and `pnpm test:kernel` passed.

The fixture replaces only model network responses. File access, permissions, terminal execution, sessions and tools use real implementations. This does not prove external provider availability or autonomous scientific correctness.

## Simple comparison, 2026-09-28

On the same macOS arm64 machine, the installed 1.1.0 and locally packaged 2.0.0 used the same `glm-5.3` model and three-row `weather.csv`. Both received the same prompt through their real interfaces, asking for the negative-rainfall date (2026-07-02) and missing-rainfall date (2026-07-03). Each cell is one run.

| Interface |      1.1.0 |      2.0.0 | Result                                    |
| --------- | ---------: | ---------: | ----------------------------------------- |
| CLI       |    30.36 s |     7.61 s | Both dates correct                        |
| Desktop   | About 94 s | About 10 s | Both dates correct; tool activity visible |

Desktop time runs from Send to the final answer appearing. The older desktop showed `bash` and `read`; 2.0.0 showed a terminal tool call. The older run displayed 17,464 tokens. Defaults for reasoning effort and context differed, so a single run cannot attribute the time difference to UI or kernel performance. Other CLI prompts took 34.59/4.59 s for a simple fact and 15.18/9.30 s for recovery (old/new), with correct final answers; the old recovery tool sequence was not verified. The temporary project credential used for testing was removed.

For a harder two-task code-repair evaluation with hidden-test scores, see the [2026-09-29 Agent benchmark](agent-benchmark-2026-09-29_en.md).

## Remaining release checks

- Earlier configuration returned HTTP 401 at the old endpoints. With the locally configured Volcengine Coding Plan endpoint, the current real CLI and desktop tasks returned answers and showed tool activity. Broader streaming and failure-recovery acceptance remains to be recorded separately. Legacy configuration is not migrated into v2 automatically.
- Artifacts are not developer-signed or notarized; the local keychain reports zero valid code-signing identities. Real Windows/Linux installation, operation and uninstall checks have not been performed.
- Concurrent control of one active session, full OS Computer Use, remote workspaces and online updates are not verified capabilities.
- Disabled inherited product modules remain in source. The UI package's unreferenced Stripe SDK, Embla, highlight.js, media-chrome and react-jsx-parser dependencies have been removed; other large UI resources still need trimming based on actual call and packaging paths. Complete physical removal is not claimed.

No push, public release or artifact upload was performed. Complete the applicable checks before stable publication.
