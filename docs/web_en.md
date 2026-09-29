# Desktop and local Web workbench

`cropcode web` has shipped with the CLI since 1.1.0. Current source builds default to the new workbench; see [workbench and design preview](workbench-preview_en.md) for its supported interactions. The screenshots, buttons and shortcuts described in the [Chinese legacy guide](web.md) refer to `/legacy`. Previously released installers keep their existing interface.

Build from source with `npm ci` and `npm run link:local`. In the project directory, run `cropcode` to configure a model, then `cropcode web`. Open the complete token-bearing URL printed by the terminal. The default is `127.0.0.1:8787`; use `cropcode web --port 8788` to choose another port. Without a global link, run `node /absolute/path/to/cropcode/packages/cli/dist/cli.js web` from your project after `npm run build`.

The server is local only. It does not support LAN or public deployment, and a phone cannot reach the computer through its own loopback address. Narrow-screen support is for small local windows. Windows Shell tools require Git for Windows Bash.

For Electron, run `npm run dev --workspace=cropcode-desktop` after building from the repository root. Closing the window stops its local host. Installed builds ask for a project directory. Desktop and browser interfaces share core sessions, tools, permissions and provider settings. Source packaging commands are in the [Desktop README](../apps/desktop/README.md). Unsigned builds are not developer-signed or notarized.

One server owns one project and runs one turn at a time. Browser tabs share an active session; switching sessions is blocked during a turn. Do not let separate terminal and Web processes write to the same session concurrently. Stopping a turn does not undo completed file writes or commands. Closing a browser tab does not stop the host or its running task; stop the host with Ctrl+C in its terminal.

Refreshing or reconnecting restores display state without resubmitting a task. Authentication removes the token from the URL. Restarting the host generates a new token, so open the newly printed complete URL when authentication expires. Do not share that URL. API keys never return in browser state; requests use your configured provider and sessions remain local.

Model settings remain available in `/legacy`, including provider selection, write-only keys, model discovery and thinking controls. A blank key preserves the current key only when staying with the same provider. Terminal `/login` and `/model` use the same configuration.

The interface shows the latest 200 messages, up to 24000 characters per message, the latest 50000 characters of process output, and a tail of up to 100000 characters while streaming. Full saved messages remain in core storage. Uploads, in-browser editing, multiple projects and parallel task panels are not supported. The new workbench renders model and tool text safely as plain text; its current scope is documented separately.
