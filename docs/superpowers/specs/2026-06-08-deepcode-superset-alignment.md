# CropCode as DeepCode Superset: Alignment Design

## Goal

CropCode is the **agricultural vertical enhanced edition** of DeepCode. It must:
1. Contain 100% of DeepCode's capabilities (strict superset)
2. Add agricultural domain features that DeepCode does not have
3. Maintain clean separation between "ported from DeepCode" and "CropCode-exclusive" code

## Scope

Port all missing DeepCode features into CropCode, organized as independent commits.

## Feature List (8 items, ordered by dependency)

### Feature 1: Permission Normalization & Merging

**Source:** `deepcode-cli/src/settings.ts` (lines 131-189)

**What to port:**
- `normalizePermissionList()` — deduplicates and validates PermissionScope arrays
- `normalizePermissionDefaultMode()` — validates defaultMode, falls back to "allowAll"
- `normalizePermissions()` — returns `Required<PermissionSettings>` with all fields resolved
- `mergePermissionLists()` — concatenates user + project scopes with dedup
- `mergePermissions()` — merges user/project permission settings with precedence logic

**Adaptation needed:**
- CropCode's `PermissionDefaultMode` includes `"plan"`, `"acceptEdits"`, `"bypassPermissions"` beyond DeepCode's `"allowAll" | "askAll"`. The `normalizePermissionDefaultMode()` must accept all CropCode values.
- CropCode's `PermissionScope` includes `"mcp"` which DeepCode has. Keep CropCode's extended scopes.

**File:** `src/settings.ts`

---

### Feature 2: Robust Process Cleanup (`killLiveProcesses`)

**Source:** `deepcode-cli/src/session.ts` (lines 337, 2499, 2586, 2649-2675)

**What to port:**
- `liveProcessKeys: Set<string>` — tracks all active processes as `sessionId:pid`
- `getProcessControlKey()` — generates the composite key
- `addSessionProcess()` — adds to tracking set when process starts
- `removeSessionProcess()` — removes from tracking set when process exits
- `killLiveProcesses()` — iterates snapshot, SIGKILL each via `killTrackedProcess`
- `killTrackedProcess()` — sends SIGKILL via `killProcessTree`, fallback to `process.kill`
- Integrate into `dispose()`, `interruptSession()`, `cleanupSessionResources()`

**Adaptation needed:**
- CropCode already has `killProcessTree` in `common/process-tree.ts` — reuse it
- CropCode's session.ts has different structure — port the tracking mechanism, not the exact line numbers

**Files:** `src/session.ts`

---

### Feature 3: Background Process Failure Log Tail

**Source:** `deepcode-cli/src/session.ts` (lines 2511-2570)

**What to port:**
- `addBackgroundProcessCompletionMessage()` — builds system message with command, status, exit info, duration
- `buildBackgroundFailureLogTailSlice()` — reads last 4KB of output file, wraps in `<background_task_failure_log>` XML tag
- `readTextFileTail()` — reads last N bytes of a text file with truncation info
- `BACKGROUND_FAILURE_LOG_TAIL_CHARS = 4000` constant
- `formatBackgroundDuration()` — human-readable duration formatting
- Wire into `onBackgroundProcessComplete` hook in tool execution

**Adaptation needed:**
- CropCode already has `BackgroundProcessCompletion` type in `tools/executor.ts` — use it
- The hook callback should be wired in `session.ts` where tool execution hooks are created

**Files:** `src/session.ts`

---

### Feature 4: Skill Resource File Enumeration

**Source:** `deepcode-cli/src/prompt.ts` (lines 179-259)

**What to port:**
- `renderSkillResources()` — lists files adjacent to skill file, formats as XML `<skill_resources>` block
- `listSkillResourceFiles()` — recursive directory walk with excluded dirs, file limit, alphabetical sort
- `DEFAULT_SKILL_RESOURCE_FILE_LIMIT = 50`
- `SKILL_RESOURCE_EXCLUDED_DIRS` Set (`.cache`, `.git`, `.next`, `.turbo`, `build`, `coverage`, `dist`, `node_modules`, `out`)
- `escapeXml()` helper
- Integrate into `buildSkillDocumentsPrompt()` — append resources to each skill block

**Adaptation needed:**
- CropCode already has `buildSkillDocumentsPrompt` — extend it, don't replace
- The excluded dirs list should include CropCode-specific dirs if any

**Files:** `src/prompt.ts`

---

### Feature 5: `getProjectCode` Path Hashing

**Source:** `deepcode-cli/src/session.ts` (lines 84-115)

**What to port:**
- `getProjectCode()` — generates filesystem-safe project identifier
- `getLegacyProjectCode()` — backward-compatible path-to-code conversion
- `sanitizeProjectCodePart()` — strips unsafe chars
- Constants: `MAX_PROJECT_CODE_LENGTH = 64`, `PROJECT_CODE_HASH_LENGTH = 16`
- Use SHA-256 hash of normalized path for long paths

**Adaptation needed:**
- Replace `~/.deepcode/projects/` with `~/.cropcode/projects/`
- Ensure backward compatibility with existing CropCode session storage paths

**Files:** `src/session.ts`

---

### Feature 6: App.tsx Utility Function Extraction

**Source:** `deepcode-cli/src/ui/utils/index.ts` and `deepcode-cli/src/ui/views/App.tsx`

**What to port:**
- Extract from App.tsx into `ui/utils/index.ts`:
  - `buildSyntheticUserMessage()` — constructs user message for tool results
  - `buildStatusLine()` — builds status bar text
  - `formatModelConfig()` — formats model + thinking config for display
  - `isCurrentSessionEmpty()` — checks if session has messages
  - `renderRawModeMessages()` — renders messages in raw mode

**Adaptation needed:**
- CropCode's `ui/utils/index.ts` already exists — add these functions alongside existing ones
- Delete the inline versions from App.tsx and replace with imports from utils
- Preserve CropCode-specific additions (provider label, token counting)

**Files:** `src/ui/utils/index.ts`, `src/ui/views/App.tsx`

---

### Feature 7: WelcomeScreen Keyboard Shortcut Tips

**Source:** `deepcode-cli/src/ui/views/WelcomeScreen.tsx` (lines 22-29)

**What to port:**
- Keyboard shortcut tips section: Enter, Shift+Enter, Ctrl+V, Esc, /, Ctrl+D
- `BUILTIN_SLASH_COMMANDS` filtering to remove duplicate tips

**Adaptation needed:**
- CropCode already shows agricultural tips — ADD keyboard shortcuts alongside, don't replace
- Show both: keyboard shortcuts AND agricultural tips

**Files:** `src/ui/views/WelcomeScreen.tsx`

---

### Feature 8: Exit After Update + Delete Session UX

**What to port:**
- `cli.tsx`: After `promptForPendingUpdate` returns `{ installed: true }`, exit immediately
- `App.tsx`: `handleDeleteSession` resets to welcome screen when deleting active session

**Files:** `src/cli.tsx`, `src/ui/views/App.tsx`

---

## CropCode-Exclusive Features (DO NOT TOUCH)

These are CropCode innovations that DeepCode does not have. Preserve and protect them:

| Feature | Files |
|---------|-------|
| Multi-provider credential system | `common/providers.ts`, `common/provider-presets.ts` |
| LoginScreen UI | `ui/LoginScreen.tsx` |
| Marketplace/plugin system | `marketplace/`, `cli.tsx` |
| Hooks engine | `hooks/` |
| Agricultural domain models | `models/` |
| Glob/grep tool handlers | `tools/glob-handler.ts`, `tools/grep-handler.ts` |
| Retry logic | `common/retry.ts` |
| Stream progress throttling | `ui/views/App.tsx` |
| Microcompact/reactive compaction | `session.ts` |
| Session rename | `session.ts` |
| Total token tracking | `ui/views/App.tsx`, `ui/views/WelcomeScreen.tsx` |
| Multi-format thinking (qwen) | `common/openai-thinking.ts` |
| Dynamic model capabilities | `common/model-capabilities.ts` |
| Zod settings validation | `settings.ts` |
| Disabled skills setting | `settings.ts` |
| Chinese system prompt | `prompt.ts` |

## Verification

After each feature commit:
1. `npx tsc -p ./ --noEmit` — typecheck passes
2. `npm test` — all tests pass
3. `npm run bundle` — build succeeds

After all features:
4. Manual smoke test: launch `cropcode`, verify welcome screen, test a tool call
5. Diff against DeepCode to confirm no regressions in ported code
