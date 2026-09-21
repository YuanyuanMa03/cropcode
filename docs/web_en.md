# Desktop and local Web workspace

`cropcode web` ships with the CLI starting with 1.1.0. Desktop and Web share a task workspace and use the terminal's session engine, model configuration, agricultural instructions, tools, permissions and local history. No separate frontend deployment is needed.

![Local workspace](assets/cropcode-web.png)

## Start

Build and link from the repository root:

```bash
npm ci
npm run link:local
```

Enter your research project, run `cropcode` to configure a model if needed, then start the browser workspace:

```bash
cd /path/to/your/project
cropcode web
cropcode web --port 8788
```

Open the complete URL printed in the terminal, including its local access token. The default listener is `127.0.0.1:8787`. There is no LAN/public hosting mode or `--host` option. Narrow layouts support small windows; a phone cannot reach the computer through its own loopback address. Stop the service with `Ctrl+C` in its terminal.

Without a global link, run `node /absolute/path/to/cropcode/packages/cli/dist/cli.js web` from the target project after `npm run build`. Standalone releases still require platform validation. Shell tools on Windows depend on Git for Windows Bash.

## Desktop workspace

After `npm run build`, launch Electron from the repository root:

```bash
npm run dev --workspace=cropcode-desktop
```

Desktop starts a local service with the window and stops it when the window closes. macOS uses native traffic lights and a draggable titlebar; other platforms keep system titlebars. Appearance follows the system's light or dark theme. Desktop and the browser load the same interface and session engine.

- The sidebar contains new tasks, search, the current project and recent tasks. Open the file panel using the project name or the top-right file button.
- New tasks place the composer in the center; conversations keep it at the bottom. Tool results, permissions and questions appear in the conversation.
- Search task titles using the search button or `Cmd+K` (`Ctrl+K` on Windows/Linux). `Esc` clears and closes search. `Cmd+N` / `Ctrl+N` creates a task, unless a task is running.
- Collapse the sidebar with its top button and reopen it from the top left. Narrow windows use a drawer that closes with the backdrop or `Esc`.
- The composer's `+` button also opens project file search. Selecting a result inserts a path reference into the draft, without sending it or editing the file. The panel shows a limited result list; narrow the query to find more files. Search respects `.gitignore`.
- Open model settings from the bottom-left settings button or the model name inside the composer; close with `Esc`.

Each service corresponds to one project directory and runs one turn at a time. Multiple tabs share the active session. Project switching, file editing, Git diff review and a standalone terminal panel are not provided. Do not run terminal and Web instances that write to the same session simultaneously.


Installed Desktop asks you to choose a project folder before starting the local host. On macOS, open the DMG matching your CPU and drag CropCode into Applications. On Windows, run the x64 EXE installer and follow the wizard. Build commands are in the [Desktop README](../apps/desktop/README.md). Without signing credentials, packages have no developer identity signature or macOS notarization.

## Conversations and tasks

- **History:** Create a task or select a recent one, with its update time. Session switching is disabled while work runs.
- **Send:** `Enter` sends; `Shift+Enter` inserts a newline. Confirming an IME candidate does not send a message.
- **Commands:** Type `/` at the start of a word to open the command menu. Use arrows to select, `Enter` or `Tab` to confirm, and `Esc` to dismiss. Available commands are `/plan`, `/new`, `/continue` and `/stop`.
- **File references:** Type `@` followed by a query. Selecting a result inserts `@path`, quoting paths with spaces. File search remains available during execution.
- **Replies:** Streaming text, task status and command output appear in the conversation. Tool results are collapsible, failures open automatically, and consecutive results are grouped. Hover a message to copy it.
- **Plan:** Select the planning checkbox. After the engine returns a proposal, discuss it or choose the button to implement it.
- **Questions and permissions:** Answer structured questions with choices or text. Permission approval or denial applies only to the listed tool calls and retains the existing permission rules.
- **Stop:** Interrupts the current turn without undoing completed effects. When reading earlier messages, use the jump-to-latest button above the composer.

## Connection, settings and data

Refreshing or reconnecting restores current state without resubmitting tasks. Closing a browser tab does not stop the service. Desktop closes its service with the window.

The local token is removed from the address bar after authentication and changes when the service restarts. Reopen the printed complete URL if authentication expires; do not share it. API keys never return to the browser. Model requests still go to the configured provider and sessions are stored locally.

Open model settings using the provider label in the composer or the sidebar. Choose a built-in provider, enter a write-only API key, select a preset model or discover models through the provider API, and adjust reasoning options. Leaving the key blank preserves it only for the current provider; switching providers requires a key. Saving applies immediately. The panel opens automatically when no model is configured. Terminal `/login` and `/model` continue to use the same configuration.

## Content limits

Basic headings, emphasis, inline code and code blocks are supported. Attachment uploads, full Markdown tables and parallel task panels are not available. Refer to project paths so existing tools can read the files.

The page displays the latest 200 messages, up to 24,000 characters per message and 50,000 characters of command output. Local session records keep the original history. Streaming text over 100,000 characters retains its tail until the saved message replaces it.
