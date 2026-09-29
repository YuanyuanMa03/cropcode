# Workbench and design preview

The new workbench connects to the existing `SessionManager`. Web and the desktop shell use one local server and share session formats, tools, permissions and model configuration with the terminal.

## Start the live workbench

Use Node 22.12+ (within Node 22) or a newer release supported by Vite:

```sh
npm install
npm run build
node packages/cli/dist/cli.js web --port 8787
```

Open the complete URL printed by the terminal, including its connection token. The server listens only on `127.0.0.1`. Authentication removes the token from the URL; an HttpOnly cookie authenticates subsequent refreshes. Do not share the complete URL.

New desktop builds load the same workbench. Previously installed applications need a rebuilt installer to include these changes. The terminal Ink interface retains its current layout.

## Supported workflow

- Real tasks for one local project: search, create and switch history. After a server restart, reopen a saved session from the list.
- Streaming model replies, collapsible thinking and tool text, process output and interruption.
- Permission requests with their commands and scopes; allow or deny each request, including after a refresh.
- Plan mode, plan implementation and free-text answers to core questions.
- Real project file lookup with `@`; `/` suggestions use the shared terminal command registry. Arrow keys select, Tab/Enter complete and Escape dismisses. Enter sends, Shift+Enter adds a line, and IME confirmation does not send.
- Automatic SSE reconnection. Full snapshots replace state instead of appending replayed messages. Tabs share one active session; the server rejects stale session and permission actions.
- In-page drafts per session, light/dark themes and narrow-screen navigation. Drafts are not persisted and are cleared by a refresh.

Model settings currently open `/legacy` through the sidebar, or can be configured with terminal `/login`. Keys are sent only to the local server and never returned in browser state. The legacy interface links back to the new workbench.

Output is rendered as safe plain text. The interface shows the latest 200 messages, limited to 24000 characters each; the core retains full history. Interactive shells, a live file diff panel and multiple projects are not available yet. Process output comes from actual core tool executions.

## Separate design preview

```sh
npm run dev:workbench
# Or
npm run build:workbench
npm run preview:workbench
```

Append `?preview=1` to `/workbench/` on the printed address, for example `http://127.0.0.1:5173/workbench/?preview=1`. Six preview scenes retain isolated fixture data and do not execute real tasks. The standalone Vite server has no session API; use the CLI server above for live work.

## Implementation boundaries

`apps/web` is the Vite entry. `packages/ui` provides React components, styles and the browser session adapter. HTTP commands and SSE snapshots reuse the local Web host; session and execution logic remain in core. The build emits an asset manifest. The host exposes only registered JS/CSS assets and fixed entry files, without arbitrary file serving or a relaxed CSP.

Verification uses the real core, file writes and history reloads. Automated tests replace only model responses and do not call a live provider. Provider availability still depends on local configuration and network access.
