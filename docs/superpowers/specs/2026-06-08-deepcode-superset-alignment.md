# CropCode as DeepCode Superset: Alignment Design

## Goal

CropCode is the **agricultural vertical enhanced edition** of DeepCode. It must:
1. Contain 100% of DeepCode's capabilities (strict superset)
2. Add agricultural domain features that DeepCode does not have
3. Maintain clean separation between "ported from DeepCode" and "CropCode-exclusive" code

## Scope

Port all missing DeepCode features into CropCode, organized as independent commits.

## Feature List (14 items, ordered by dependency)

---

### Feature 1: Permission Normalization & Merging

**Source:** `deepcode-cli/src/settings.ts` (lines 131-189)

**What to port:**
- `normalizePermissionList()` — deduplicates and validates PermissionScope arrays
- `normalizePermissionDefaultMode()` — validates defaultMode, falls back to "allowAll"
- `normalizePermissions()` — returns `Required<PermissionSettings>` with all fields resolved
- `mergePermissionLists()` — concatenates user + project scopes with dedup
- `mergePermissions()` — merges user/project permission settings with precedence logic

**Adaptation:**
- CropCode's `PermissionDefaultMode` includes `"plan"`, `"acceptEdits"`, `"bypassPermissions"` — must accept all
- CropCode's `PermissionScope` includes `"mcp"` — keep it

**File:** `src/settings.ts`

---

### Feature 2: Robust Process Cleanup (`killLiveProcesses`)

**Source:** `deepcode-cli/src/session.ts` (lines 337, 2499, 2586, 2649-2675)

**What to port:**
- `liveProcessKeys: Set<string>` — tracks all active processes as `sessionId:pid`
- `getProcessControlKey()`, `addSessionProcess()`, `removeSessionProcess()`
- `killLiveProcesses()` — iterates snapshot, SIGKILL each
- `killTrackedProcess()` — sends SIGKILL via `killProcessTree`, fallback to `process.kill`
- Integrate into `dispose()`, `interruptSession()`, `cleanupSessionResources()`

**Adaptation:** Reuse CropCode's existing `killProcessTree` from `common/process-tree.ts`

**File:** `src/session.ts`

---

### Feature 3: Background Process Failure Log Tail

**Source:** `deepcode-cli/src/session.ts` (lines 2511-2570)

**What to port:**
- `addBackgroundProcessCompletionMessage()` — builds system message with command, status, exit info, duration
- `buildBackgroundFailureLogTailSlice()` — reads last 4KB of output file, wraps in `<background_task_failure_log>` XML
- `readTextFileTail()` — reads last N bytes with truncation info
- `BACKGROUND_FAILURE_LOG_TAIL_CHARS = 4000`
- `formatBackgroundDuration()`
- Wire into `onBackgroundProcessComplete` hook

**File:** `src/session.ts`

---

### Feature 4: Skill Resource File Enumeration

**Source:** `deepcode-cli/src/prompt.ts` (lines 179-259)

**What to port:**
- `renderSkillResources()` — lists files adjacent to skill, formats as XML `<skill_resources>`
- `listSkillResourceFiles()` — recursive walk with excluded dirs, limit 50, alphabetical sort
- `DEFAULT_SKILL_RESOURCE_FILE_LIMIT = 50`
- `SKILL_RESOURCE_EXCLUDED_DIRS` Set
- `escapeXml()`, `toPosixPath()` helpers
- Integrate into `buildSkillDocumentsPrompt()`

**File:** `src/prompt.ts`

---

### Feature 5: `getProjectCode` Path Hashing

**Source:** `deepcode-cli/src/session.ts` (lines 84-115)

**What to port:**
- `getProjectCode()` — filesystem-safe project identifier via SHA-256 hash
- `getLegacyProjectCode()`, `sanitizeProjectCodePart()`
- Constants: `MAX_PROJECT_CODE_LENGTH = 64`, `PROJECT_CODE_HASH_LENGTH = 16`

**Adaptation:** Use `~/.cropcode/projects/` instead of `~/.deepcode/projects/`

**File:** `src/session.ts`

---

### Feature 6: App.tsx Utility Function Extraction

**Source:** `deepcode-cli/src/ui/utils/index.ts` and `deepcode-cli/src/ui/views/App.tsx`

**What to port:**
- Extract to `ui/utils/index.ts`:
  - `buildSyntheticUserMessage()`
  - `buildStatusLine()`
  - `formatModelConfig()`
  - `isCurrentSessionEmpty()`
  - `renderRawModeMessages()`

**Adaptation:** Delete inline versions from App.tsx, replace with imports. Preserve CropCode-specific (provider label, token counting).

**Files:** `src/ui/utils/index.ts`, `src/ui/views/App.tsx`

---

### Feature 7: WelcomeScreen Keyboard Shortcut Tips

**Source:** `deepcode-cli/src/ui/views/WelcomeScreen.tsx` (lines 22-29)

**What to port:**
- Keyboard shortcut tips: Enter, Shift+Enter, Ctrl+V, Esc, /, Ctrl+D
- `BUILTIN_SLASH_COMMANDS` filtering to remove duplicate tips

**Adaptation:** ADD keyboard shortcuts alongside existing agricultural tips, don't replace

**File:** `src/ui/views/WelcomeScreen.tsx`

---

### Feature 8: Exit After Update + Delete Session UX

**What to port:**
- `cli.tsx`: Exit immediately after `promptForPendingUpdate` returns `{ installed: true }`
- `App.tsx`: `handleDeleteSession` resets to welcome screen when deleting active session

**Files:** `src/cli.tsx`, `src/ui/views/App.tsx`

---

### Feature 9: Bash Tool — Add `sideEffects` and `run_in_background`

**Source:** `deepcode-cli/src/prompt.ts` (bash tool definition) and `deepcode-cli/templates/tools/bash.md`

**What to port:**
- Add `sideEffects` parameter to bash tool definition in `getTools()` — enum of permission scopes
- Add `run_in_background` parameter — boolean for background execution
- Add `stopCommand` parameter for background tasks
- Update `templates/tools/bash.md` with full documentation of these parameters
- Update JSON schema to require `["command", "sideEffects"]`

**Adaptation:** Keep CropCode's existing bash handler logic, just add the parameter definitions

**Files:** `src/prompt.ts`, `templates/tools/bash.md`

---

### Feature 10: Edit Tool — Align `snippet_id` as Required

**Source:** `deepcode-cli/src/prompt.ts` (edit tool definition) and `deepcode-cli/templates/tools/edit.md`

**What to port:**
- Make `snippet_id` a required parameter (currently optional in CropCode)
- Make `file_path` optional (guard only)
- Update description: "snippet_id defines the search scope. Provide file_path only as an optional guard."
- Update `templates/tools/edit.md` accordingly

**Files:** `src/prompt.ts`, `templates/tools/edit.md`

---

### Feature 11: Tool Docs Templates Alignment

**Source:** `deepcode-cli/templates/tools/` and `deepcode-cli/templates/skills/`

**What to port:**

1. `templates/tools/bash.md` — add `sideEffects` and `run_in_background` documentation (matches Feature 9)
2. `templates/tools/edit.md` — align parameter requirements (matches Feature 10)
3. `templates/tools/read.md.ejs` — simplify snippet_id description to: "Text reads return a snippet id in metadata. You can pass that snippet id to the Edit tool to constrain replacements to just that read range."
4. `templates/skills/karpathy-guidelines.md` — add missing line: "**Internal use:** Apply these guidelines silently. Do not cite this document, its title, or guideline names in user-facing responses."

**Files:** `templates/tools/bash.md`, `templates/tools/edit.md`, `templates/tools/read.md.ejs`, `templates/skills/karpathy-guidelines.md`

---

### Feature 12: Date Format to Chinese

**Source:** `deepcode-cli/src/prompt.ts` (getCurrentDateAndModelPrompt)

**What to change:**
- Change from English: `"Today's date is 2026/06/08. As the conversation progresses, time passes."`
- To Chinese: `"今天是2026年6月8日。随着对话的进行，时间在流逝。"`
- Change model line: `"Current LLM model is..."` → `"当前LLM模型为...，对话中可通过/model命令切换模型。"`

**File:** `src/prompt.ts`

---

### Feature 13: Skill Documents Prompt Type Export

**Source:** `deepcode-cli/src/prompt.ts`

**What to port:**
- Export `SkillPromptDocument` type (with `name`, `content`, `path?`, `skillFilePath?` fields)
- This type is needed by the skill resource discovery system (Feature 4) and by the session layer for skill loading

**File:** `src/prompt.ts`

---

### Feature 14: System Prompt — Minimal Chinese Alignment (极简对齐)

**Source:** `deepcode-cli/src/prompt.ts` (`SYSTEM_PROMPT_BASE`)

**Strategy:** Adopt DeepCode's minimal Chinese system prompt approach. The system prompt is kept short (3 lines). Detailed behavioral guidelines are expressed through tool docs (`templates/tools/*.md`) and skill templates (`templates/skills/*.md`), not in the system prompt itself.

**What to change:**

Replace CropCode's current 57-line English `SYSTEM_PROMPT_BASE` with DeepCode's minimal 3-line Chinese structure:

```
You are an AI coding agent working in a terminal environment. Your role is to help users with software engineering tasks.

The current working directory is the project root. All file paths are relative to it unless otherwise noted.

Never run commands that modify or access files outside the working directory unless explicitly instructed.
```

Adapted for CropCode with slight agricultural lean:

```typescript
const SYSTEM_PROMPT_BASE = `你是一个在终端环境中工作的AI编码助手。你的角色是帮助用户完成软件工程任务。

当前工作目录是项目根目录。所有文件路径相对于此目录，除非另有说明。

不要运行修改或访问工作目录之外文件的命令，除非用户明确指示。`;
```

**What stays the same:**
- Runtime context section (workspace info, date, model, git status, etc.)
- Tool definitions and their parameter schemas
- Skill templates and their content
- MCP tool definitions

**What moves:**
- "Executing Actions with Care" guidelines → already in tool docs (bash.md, edit.md)
- "Using Your Tools" guidelines → already in tool docs
- "Communication Style" → move to a skill template if needed
- "Agricultural Context" → move to a skill template (e.g., `agricultural-context.md`)
- "Task Management" → move to a skill template

**CropCode-exclusive additions to preserve:**
- Keep the tool alphabet sorting (cache optimization)
- Keep CropCode's extended tool set (glob, grep)

**File:** `src/prompt.ts`

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
| Glob/grep tool definitions and handlers | `prompt.ts`, `tools/glob-handler.ts`, `tools/grep-handler.ts` |
| Glob/grep tool docs | `templates/tools/glob.md`, `templates/tools/grep.md` |
| Retry logic | `common/retry.ts` |
| Stream progress throttling | `ui/views/App.tsx` |
| Microcompact/reactive compaction | `session.ts` |
| Session rename | `session.ts` |
| Total token tracking | `ui/views/App.tsx`, `ui/views/WelcomeScreen.tsx` |
| Multi-format thinking (qwen) | `common/openai-thinking.ts` |
| Dynamic model capabilities | `common/model-capabilities.ts` |
| Zod settings validation | `settings.ts` |
| Disabled skills setting | `settings.ts` |
| Tool alphabet sorting (cache optimization) | `prompt.ts` |
| Extra slash commands (/login, /marketplace, /plugin) | `ui/core/slash-commands.ts` |
| Disabled skill label (✕) in slash commands | `ui/core/slash-commands.ts` |
| Extra default skill templates (agent-drift-guard, plan-and-execute) | `templates/skills/` |

## Verification

After each feature commit:
1. `npx tsc -p ./ --noEmit` — typecheck passes
2. `npm test` — all tests pass
3. `npm run bundle` — build succeeds

After all features:
4. Manual smoke test: launch `cropcode`, verify welcome screen, test a tool call
5. Diff against DeepCode to confirm no regressions in ported code
