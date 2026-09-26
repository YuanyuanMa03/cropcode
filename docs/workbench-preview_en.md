# Workbench design preview

This P0 preview uses fixture data to evaluate the three-surface layout, themes, and interactions. It does not connect to the session core, read project files, store provider keys, contact models, or execute terminal commands. Existing `cropcode web`, terminal, and desktop releases continue using their current interfaces.

## Run

From the repository root, use Node 22.12+ within the Node 22 line, or a newer version supported by Vite:

```sh
npm install
npm run dev:workbench
```

Open the printed loopback URL, normally `http://127.0.0.1:5173`. The development server binds only to loopback. To build and preview:

```sh
npm run build:workbench
npm run preview:workbench
```

Development tooling is not shipped in the current CLI or desktop installers.

## Preview coverage

The top bar switches between six scenes: project home, conversation, permission, files and changes, settings, and terminal. It also exposes loading, empty, and connection-error examples. Reset clears the current demo input and permission state.

- Project and task navigation, search, and per-task drafts.
- Multiline input, fixture file/command suggestions, and clearly marked demo replies.
- Allow-once or deny interactions with explicit result feedback.
- File search, read-only files, code differences, and example chart artifacts.
- Light and dark themes. Only the theme preference persists in browser storage; demo tasks reset on refresh.
- Terminal appearance and input feedback. This is a browser-based design example, not a Shell or a change to the real Ink interface.
- Narrow-screen navigation and file panels. Responsive layout does not imply cross-device connectivity.

`Cmd/Ctrl+K` opens task search; `Cmd/Ctrl+N` starts a demo task. Enter submits and Shift+Enter inserts a newline. IME composition confirmation must not submit. Escape closes navigation and file panels.

## Implementation boundary

`apps/web` is the Vite entry point. `packages/ui` contains React components, semantic CSS design variables, and isolated fixtures. The preview uses Radix Dialog and icons. Tailwind, Zustand, protocol definitions, and real service adapters will be introduced only in their respective stages.

No ZCode source or brand assets were copied into this implementation. Before replacing the existing Web interface, subsequent stages must integrate the real core, task/project contracts, reconnect recovery, asset manifests, and installer validation.
