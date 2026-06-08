# DeepCode Superset Alignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port all 14 missing DeepCode features into CropCode, making CropCode a strict superset of DeepCode.

**Architecture:** Each feature is an independent commit touching 1-3 files. Features are ordered by dependency — later features may depend on types/functions introduced by earlier ones.

**Tech Stack:** TypeScript, ESM, Node.js 22+, esbuild, React/Ink (TUI), Zod (validation)

---

## File Structure

| File | Responsibility | Features |
|------|---------------|----------|
| `src/settings.ts` | Permission normalization/merging | 1 |
| `src/session.ts` | Process tracking, failure logs, project code hashing | 2, 3, 5 |
| `src/prompt.ts` | Skill resources, tool defs, date format, system prompt, type export | 4, 9, 10, 12, 13, 14 |
| `src/ui/utils/index.ts` | Extracted utility functions | 6 |
| `src/ui/views/App.tsx` | Delete session UX, remove extracted utils | 6, 8 |
| `src/ui/views/WelcomeScreen.tsx` | Keyboard shortcut tips | 7 |
| `src/cli.tsx` | Exit after update | 8 |
| `templates/tools/bash.md` | Bash tool docs | 9, 11 |
| `templates/tools/edit.md` | Edit tool docs | 10, 11 |
| `templates/tools/read.md.ejs` | Read tool docs | 11 |
| `templates/skills/karpathy-guidelines.md` | Karpathy skill docs | 11 |
| `src/tests/settings.test.ts` | Permission tests | 1 |

---

### Task 1: Permission Normalization & Merging

**Files:**
- Modify: `src/settings.ts`
- Create: `src/tests/settings.test.ts`

- [ ] **Step 1: Add permission normalization functions to settings.ts**

Add these functions after the existing `mergeDisabledSkills` function (around line 269):

```typescript
export function normalizePermissionList(scopes: PermissionScope[] | undefined): PermissionScope[] {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [];
  }
  const seen = new Set<PermissionScope>();
  const result: PermissionScope[] = [];
  for (const scope of scopes) {
    if (!seen.has(scope)) {
      seen.add(scope);
      result.push(scope);
    }
  }
  return result;
}

export function normalizePermissionDefaultMode(
  value: unknown
): PermissionDefaultMode {
  if (
    value === "allowAll" ||
    value === "askAll" ||
    value === "plan" ||
    value === "acceptEdits" ||
    value === "bypassPermissions"
  ) {
    return value;
  }
  return "allowAll";
}

export function normalizePermissions(
  permissions: PermissionSettings | undefined
): Required<PermissionSettings> {
  return {
    allow: normalizePermissionList(permissions?.allow),
    deny: normalizePermissionList(permissions?.deny),
    ask: normalizePermissionList(permissions?.ask),
    defaultMode: normalizePermissionDefaultMode(permissions?.defaultMode),
  };
}

export function mergePermissionLists(
  user: PermissionScope[],
  project: PermissionScope[]
): PermissionScope[] {
  return normalizePermissionList([...user, ...project]);
}

export function mergePermissions(
  userSettings: DeepcodingSettings | null | undefined,
  projectSettings: DeepcodingSettings | null | undefined
): Required<PermissionSettings> {
  const user = normalizePermissions(userSettings?.permissions);
  const project = normalizePermissions(projectSettings?.permissions);

  return {
    allow: mergePermissionLists(user.allow, project.allow),
    deny: mergePermissionLists(user.deny, project.deny),
    ask: mergePermissionLists(user.ask, project.ask),
    defaultMode: project.defaultMode !== "allowAll"
      ? project.defaultMode
      : user.defaultMode,
  };
}
```

- [ ] **Step 2: Update `resolveSettingsSources` to use `mergePermissions`**

In `src/settings.ts`, change the `permissions` assignment in `resolveSettingsSources` (around line 334):

```typescript
// Before:
const permissions = projectSettings?.permissions ?? userSettings?.permissions;

// After:
const permissions = mergePermissions(userSettings, projectSettings);
```

Also update the return type — change `permissions?: PermissionSettings` to `permissions: Required<PermissionSettings>` in `ResolvedDeepcodingSettings` (line 58).

- [ ] **Step 3: Write tests**

Create `src/tests/settings.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";
import {
  normalizePermissionList,
  normalizePermissionDefaultMode,
  normalizePermissions,
  mergePermissionLists,
  mergePermissions,
} from "../settings";

describe("normalizePermissionList", () => {
  it("returns empty array for undefined", () => {
    assert.deepStrictEqual(normalizePermissionList(undefined), []);
  });

  it("deduplicates scopes", () => {
    const input = ["read-in-cwd", "write-in-cwd", "read-in-cwd"];
    const result = normalizePermissionList(input);
    assert.deepStrictEqual(result, ["read-in-cwd", "write-in-cwd"]);
  });

  it("preserves order of first occurrence", () => {
    const input = ["write-in-cwd", "read-in-cwd", "network"];
    const result = normalizePermissionList(input);
    assert.deepStrictEqual(result, ["write-in-cwd", "read-in-cwd", "network"]);
  });
});

describe("normalizePermissionDefaultMode", () => {
  it("returns valid modes unchanged", () => {
    assert.strictEqual(normalizePermissionDefaultMode("allowAll"), "allowAll");
    assert.strictEqual(normalizePermissionDefaultMode("askAll"), "askAll");
    assert.strictEqual(normalizePermissionDefaultMode("plan"), "plan");
    assert.strictEqual(normalizePermissionDefaultMode("acceptEdits"), "acceptEdits");
    assert.strictEqual(normalizePermissionDefaultMode("bypassPermissions"), "bypassPermissions");
  });

  it("falls back to allowAll for invalid values", () => {
    assert.strictEqual(normalizePermissionDefaultMode(undefined), "allowAll");
    assert.strictEqual(normalizePermissionDefaultMode("invalid"), "allowAll");
    assert.strictEqual(normalizePermissionDefaultMode(42), "allowAll");
  });
});

describe("normalizePermissions", () => {
  it("returns all fields with defaults for undefined input", () => {
    const result = normalizePermissions(undefined);
    assert.deepStrictEqual(result, {
      allow: [],
      deny: [],
      ask: [],
      defaultMode: "allowAll",
    });
  });

  it("normalizes and deduplicates", () => {
    const result = normalizePermissions({
      allow: ["read-in-cwd", "read-in-cwd", "write-in-cwd"],
      defaultMode: "plan",
    });
    assert.deepStrictEqual(result.allow, ["read-in-cwd", "write-in-cwd"]);
    assert.strictEqual(result.defaultMode, "plan");
  });
});

describe("mergePermissionLists", () => {
  it("merges and deduplicates", () => {
    const result = mergePermissionLists(
      ["read-in-cwd", "write-in-cwd"],
      ["write-in-cwd", "network"]
    );
    assert.deepStrictEqual(result, ["read-in-cwd", "write-in-cwd", "network"]);
  });
});

describe("mergePermissions", () => {
  it("project settings take precedence for defaultMode", () => {
    const result = mergePermissions(
      { permissions: { defaultMode: "allowAll" } },
      { permissions: { defaultMode: "askAll" } }
    );
    assert.strictEqual(result.defaultMode, "askAll");
  });

  it("user defaultMode used when project is allowAll", () => {
    const result = mergePermissions(
      { permissions: { defaultMode: "plan" } },
      { permissions: { defaultMode: "allowAll" } }
    );
    assert.strictEqual(result.defaultMode, "plan");
  });

  it("merges allow lists from both sources", () => {
    const result = mergePermissions(
      { permissions: { allow: ["read-in-cwd"] } },
      { permissions: { allow: ["write-in-cwd"] } }
    );
    assert.deepStrictEqual(result.allow, ["read-in-cwd", "write-in-cwd"]);
  });
});
```

- [ ] **Step 4: Run tests to verify**

Run: `npx tsx --test src/tests/settings.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 6: Commit**

```bash
git add src/settings.ts src/tests/settings.test.ts
git commit -m "feat: add permission normalization and merging (DeepCode alignment)"
```

---

### Task 2: Robust Process Cleanup (`killLiveProcesses`)

**Files:**
- Modify: `src/session.ts`

- [ ] **Step 1: Add `liveProcessKeys` set and tracking methods**

In `src/session.ts`, add after the `consecutiveCompactFailures` field (around line 316):

```typescript
private readonly liveProcessKeys = new Set<string>();
```

Add these methods after `getProcessControlKey` (around line 2901):

```typescript
private addLiveProcess(sessionId: string, processId: string | number): void {
  this.liveProcessKeys.add(this.getProcessControlKey(sessionId, processId));
}

private removeLiveProcess(sessionId: string, processId: string | number): void {
  this.liveProcessKeys.delete(this.getProcessControlKey(sessionId, processId));
}

private killLiveProcesses(): void {
  const snapshot = Array.from(this.liveProcessKeys);
  for (const key of snapshot) {
    const [, pidStr] = key.split(":");
    const pid = Number(pidStr);
    if (Number.isInteger(pid) && pid > 0) {
      this.killTrackedProcess(pid);
    }
  }
  this.liveProcessKeys.clear();
}

private killTrackedProcess(pid: number): void {
  try {
    killProcessTree(pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // ignore
    }
  }
}
```

- [ ] **Step 2: Wire tracking into `addSessionProcess` and `removeSessionProcess`**

In `addSessionProcess` (around line 2825), add after the `updateSessionEntry` call:

```typescript
this.addLiveProcess(sessionId, processId);
```

In `removeSessionProcess` (around line 2838), add after the `processTimeoutControls.delete` call:

```typescript
this.removeLiveProcess(sessionId, processId);
```

- [ ] **Step 3: Call `killLiveProcesses()` in `dispose()`**

In the `dispose()` method (around line 372), add at the beginning:

```typescript
this.killLiveProcesses();
```

- [ ] **Step 4: Call `killLiveProcesses()` in `interruptSession()`**

In `interruptSession` (around line 1684), add before the existing process-killing loop:

```typescript
this.killLiveProcesses();
```

And remove the manual loop that kills processes since `killLiveProcesses` handles it. The simplified `interruptSession` should look like:

```typescript
interruptSession(sessionId: string): void {
  this.killLiveProcesses();

  const controller = this.sessionControllers.get(sessionId);
  if (controller) {
    controller.abort();
    this.sessionControllers.delete(sessionId);
  }

  const now = new Date().toISOString();
  this.updateSessionEntry(sessionId, (entry) => ({
    ...entry,
    status: "interrupted",
    failReason: "interrupted",
    processes: null,
    updateTime: now,
  }));
  clearSessionState(sessionId);
  clearSessionWorkingDir(sessionId);

  this.onAssistantMessage(this.buildUserMessage(sessionId, { text: "Interrupted." }), false);
}
```

- [ ] **Step 5: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/session.ts
git commit -m "feat: add robust process cleanup with killLiveProcesses (DeepCode alignment)"
```

---

### Task 3: Background Process Failure Log Tail

**Files:**
- Modify: `src/session.ts`

- [ ] **Step 1: Add constants and helper functions**

Add after the imports (around line 56):

```typescript
const BACKGROUND_FAILURE_LOG_TAIL_CHARS = 4000;
```

Add these methods to the `SessionManager` class (after `killTrackedProcess`):

```typescript
private readTextFileTail(filePath: string, maxBytes: number): { text: string; truncated: boolean } {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size === 0) {
      return { text: "", truncated: false };
    }
    const fd = fs.openSync(filePath, "r");
    try {
      const readSize = Math.min(stat.size, maxBytes);
      const buffer = Buffer.alloc(readSize);
      fs.readSync(fd, buffer, 0, readSize, stat.size - readSize);
      const text = buffer.toString("utf8");
      return {
        text: stat.size > maxBytes ? text : text.trim(),
        truncated: stat.size > maxBytes,
      };
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return { text: "", truncated: false };
  }
}

private formatBackgroundDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60_000).toFixed(1)}m`;
}

private buildBackgroundFailureLogTailSlice(outputFilePath: string): string {
  const { text, truncated } = this.readTextFileTail(
    outputFilePath,
    BACKGROUND_FAILURE_LOG_TAIL_CHARS
  );
  if (!text) return "";
  const prefix = truncated ? "(truncated) " : "";
  return `<background_task_failure_log>\n${prefix}${text}\n</background_task_failure_log>`;
}

private addBackgroundProcessCompletionMessage(
  sessionId: string,
  command: string,
  exitCode: number | null,
  durationMs: number,
  outputFilePath?: string
): void {
  const status = exitCode === 0 ? "completed" : "failed";
  const exitInfo = exitCode !== null ? `exit code ${exitCode}` : "unknown exit code";
  const duration = this.formatBackgroundDuration(durationMs);

  let content = `Background process ${status}: \`${command}\`\nStatus: ${exitInfo}\nDuration: ${duration}`;

  if (exitCode !== 0 && outputFilePath) {
    const tailSlice = this.buildBackgroundFailureLogTailSlice(outputFilePath);
    if (tailSlice) {
      content += `\n\n${tailSlice}`;
    }
  }

  this.addSessionSystemMessage(sessionId, content, true);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 3: Commit**

```bash
git add src/session.ts
git commit -m "feat: add background process failure log tail (DeepCode alignment)"
```

---

### Task 4: Skill Resource File Enumeration

**Files:**
- Modify: `src/prompt.ts`

- [ ] **Step 1: Add skill resource functions**

Add these after the `readDefaultSkillDocs` function (around line 198):

```typescript
const DEFAULT_SKILL_RESOURCE_FILE_LIMIT = 50;

const SKILL_RESOURCE_EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "target",
]);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function listSkillResourceFiles(skillFilePath: string, limit = DEFAULT_SKILL_RESOURCE_FILE_LIMIT): string[] {
  const skillDir = path.dirname(skillFilePath);
  const files: string[] = [];

  function walk(dir: string): void {
    if (files.length >= limit) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (files.length >= limit) break;
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKILL_RESOURCE_EXCLUDED_DIRS.has(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  walk(skillDir);
  return files.slice(0, limit);
}

function renderSkillResources(skillFilePath: string): string {
  const files = listSkillResourceFiles(skillFilePath);
  if (files.length === 0) return "";

  const skillDir = path.dirname(skillFilePath);
  const fileList = files
    .map((f) => `  <file>${escapeXml(toPosixPath(path.relative(skillDir, f)))}</file>`)
    .join("\n");

  return `<skill_resources path="${escapeXml(toPosixPath(skillFilePath))}">\n${fileList}\n</skill_resources>`;
}
```

- [ ] **Step 2: Export `SkillPromptDocument` type**

Add after the `ToolDefinition` type (around line 369):

```typescript
export type SkillPromptDocument = {
  name: string;
  content: string;
  path?: string;
  skillFilePath?: string;
};
```

- [ ] **Step 3: Add `renderSkillDocumentBlock` and `buildSkillDocumentsPrompt`**

Add after the `renderSkillResources` function:

```typescript
function renderSkillDocumentBlock(doc: SkillPromptDocument): string {
  const skillResources = doc.skillFilePath ? renderSkillResources(doc.skillFilePath) : "";
  const pathAttr = doc.path ? ` path="${escapeXml(doc.path)}"` : "";
  const resourceSection = skillResources ? `\n${skillResources}` : "";

  return `<skill-document name="${escapeXml(doc.name)}"${pathAttr}>\n${doc.content}${resourceSection}\n</skill-document>`;
}

export function buildSkillDocumentsPrompt(docs: SkillPromptDocument[]): string {
  if (docs.length === 0) return "";
  const blocks = docs.map(renderSkillDocumentBlock);
  return `Use the skill documents below to assist the user:\n${blocks.join("\n\n")}`;
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 5: Commit**

```bash
git add src/prompt.ts
git commit -m "feat: add skill resource file enumeration and SkillPromptDocument type (DeepCode alignment)"
```

---

### Task 5: `getProjectCode` Path Hashing

**Files:**
- Modify: `src/session.ts`

- [ ] **Step 1: Replace the existing `getProjectCode` method**

The current implementation (line 1962) is a simple string replacement:

```typescript
private getProjectCode(projectRoot: string): string {
  return projectRoot.replace(/[/\\]/g, "-").replace(/:/g, "");
}
```

Replace it with a SHA-256 based implementation (DeepCode approach):

```typescript
private getProjectCode(projectRoot: string): string {
  const legacyCode = this.getLegacyProjectCode(projectRoot);
  const legacyDir = path.join(os.homedir(), ".cropcode", "projects", legacyCode);
  if (fs.existsSync(legacyDir)) {
    return legacyCode;
  }
  return this.sanitizeProjectCodePart(
    crypto.createHash("sha256").update(projectRoot).digest("hex").slice(0, 16)
  );
}

private getLegacyProjectCode(projectRoot: string): string {
  return projectRoot.replace(/[/\\]/g, "-").replace(/:/g, "");
}

private sanitizeProjectCodePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}
```

This preserves backward compatibility: if a legacy project directory exists, it continues using it. New projects get the hashed path.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 3: Commit**

```bash
git add src/session.ts
git commit -m "feat: add getProjectCode path hashing with legacy fallback (DeepCode alignment)"
```

---

### Task 6: App.tsx Utility Function Extraction

**Files:**
- Modify: `src/ui/utils/index.ts`
- Modify: `src/ui/views/App.tsx`

- [ ] **Step 1: Verify utils/index.ts already has the functions**

The `src/ui/utils/index.ts` file already contains:
- `buildSyntheticUserMessage()` (line 24)
- `buildStatusLine()` (line 67)
- `formatModelConfig()` (line 88)
- `isCurrentSessionEmpty()` (line 62)
- `renderRawModeMessages()` (line 8)

These match the DeepCode spec. No new functions need to be added.

- [ ] **Step 2: Verify App.tsx imports from utils**

Check that `App.tsx` imports these functions from `../../ui/utils` rather than defining them inline. If any are still inline in App.tsx, extract them.

Run: `grep -n "buildSyntheticUserMessage\|buildStatusLine\|formatModelConfig\|isCurrentSessionEmpty\|renderRawModeMessages" /Volumes/SamsungT7/git/cropcode/src/ui/views/App.tsx`

If any are defined inline in App.tsx instead of imported from utils, replace the inline definitions with imports.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 4: Commit**

```bash
git add src/ui/utils/index.ts src/ui/views/App.tsx
git commit -m "feat: extract App.tsx utility functions to utils/index.ts (DeepCode alignment)"
```

---

### Task 7: WelcomeScreen Keyboard Shortcut Tips

**Files:**
- Modify: `src/ui/views/WelcomeScreen.tsx`

- [ ] **Step 1: Add keyboard shortcut tips constant**

Add after the `AGRICULTURAL_TIPS` constant (around line 33):

```typescript
const KEYBOARD_SHORTCUT_TIPS = [
  { label: "Enter", description: "Send the prompt" },
  { label: "Shift+Enter", description: "Insert a newline" },
  { label: "Ctrl+V", description: "Paste an image from clipboard" },
  { label: "Esc", description: "Interrupt the current model turn" },
  { label: "/", description: "Open the skills/commands menu" },
  { label: "Ctrl+D", description: "Exit CropCode" },
];
```

- [ ] **Step 2: Update `buildWelcomeTips` to include keyboard shortcuts**

In the `buildWelcomeTips` function (around line 129), add keyboard shortcut tips alongside the existing agricultural tips:

```typescript
export function buildWelcomeTips(skills: SkillInfo[]): Array<{ label: string; description: string }> {
  const slashTips = buildSlashCommands(skills)
    .filter((item) => item.kind !== "skill" || item.skill?.isLoaded)
    .map((item) => ({
      label: item.label,
      description: formatSlashCommandDescription(item.description),
    }));

  return [...AGRICULTURAL_TIPS, ...KEYBOARD_SHORTCUT_TIPS, ...slashTips];
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 4: Commit**

```bash
git add src/ui/views/WelcomeScreen.tsx
git commit -m "feat: add keyboard shortcut tips to WelcomeScreen (DeepCode alignment)"
```

---

### Task 8: Exit After Update + Delete Session UX

**Files:**
- Modify: `src/cli.tsx`
- Modify: `src/ui/views/App.tsx`

- [ ] **Step 1: Exit immediately after successful update in cli.tsx**

In `src/cli.tsx`, the `main()` function (around line 210) calls `promptForPendingUpdate` and then proceeds to start the app regardless. Change it to exit after a successful install:

In the `main()` function, after the `promptForPendingUpdate` call (line 211), add:

```typescript
async function main(): Promise<void> {
  const updatePromptResult = await promptForPendingUpdate(packageInfo);
  if (updatePromptResult.installed) {
    process.exit(0);
  }

  const restartRef: { current: (() => void) | null } = { current: null };
  // ... rest of the function
```

Also remove the conditional `checkForNpmUpdate` call since we always want to check:

```typescript
  // Remove the if-check, always call:
  void checkForNpmUpdate(packageInfo);
```

- [ ] **Step 2: Reset to welcome screen when deleting active session**

In `src/ui/views/App.tsx`, update `handleDeleteSession` (around line 670):

```typescript
const handleDeleteSession = useCallback(
  (sessionId: string): void => {
    const activeSessionId = sessionManager.getActiveSessionId();
    sessionManager.deleteSession(sessionId);
    if (sessionId === activeSessionId) {
      sessionManager.setActiveSessionId(null);
      setShowWelcome(true);
      setView("chat");
    }
    refreshSessionsList();
  },
  [sessionManager, refreshSessionsList]
);
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 4: Commit**

```bash
git add src/cli.tsx src/ui/views/App.tsx
git commit -m "feat: exit after update, reset welcome on session delete (DeepCode alignment)"
```

---

### Task 9: Bash Tool — Add `sideEffects` and `run_in_background`

**Files:**
- Modify: `src/prompt.ts`
- Modify: `templates/tools/bash.md`

- [ ] **Step 1: Update bash tool definition in prompt.ts**

In the `getTools` function, update the bash tool definition (around line 372). Add `sideEffects` and `run_in_background` parameters:

```typescript
{
  type: "function",
  function: {
    name: "bash",
    description: "Execute shell commands in a persistent bash session.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        description: {
          type: "string",
          description:
            'Clear, concise description of what this command does in active voice. Never use words like "complex" or "risk" in the description - just describe what it does.',
        },
        sideEffects: {
          type: "string",
          enum: [
            "read-in-cwd",
            "read-out-cwd",
            "write-in-cwd",
            "write-out-cwd",
            "delete-in-cwd",
            "delete-out-cwd",
            "query-git-log",
            "mutate-git-log",
            "network",
            "mcp",
          ],
          description:
            "Permission scope that best describes the side effects of this command. Required for every bash call.",
        },
        run_in_background: {
          type: "boolean",
          description:
            "Set to true to run this command in the background. You will be notified when it finishes. Only use this if you don't need the result immediately and are OK being notified when it completes. You do not need to use '&' at the end of the command when using this parameter.",
        },
        stopCommand: {
          type: "string",
          description:
            "If run_in_background is true, an optional command to stop the background process (e.g. 'Ctrl+C', 'kill %1').",
        },
      },
      required: ["command", "sideEffects"],
      additionalProperties: false,
    },
  },
},
```

- [ ] **Step 2: Update bash.md tool docs**

Replace the content of `templates/tools/bash.md` with the updated version that documents `sideEffects` and `run_in_background`. The key additions are:

After the existing "Usage notes:" section, add:

```markdown
  - The `sideEffects` parameter is required for every bash call. Choose the permission scope that best describes what the command does.
  - The `run_in_background` parameter is optional. Set to true to run this command in the background. You will be notified when it finishes. Only use this if you don't need the result immediately and are OK being notified when it completes. You do not need to use '&' at the end of the command when using this parameter.
    - If the command is long running and you would like to be notified when it finishes — use `run_in_background`.
    - Do not retry failing commands in a sleep loop — diagnose the root cause.
    - If waiting for a background task, you will be notified when it completes — do not poll.
    - If you must poll an external process, use a check command (e.g. `gh run view`) rather than sleeping first.
    - If you must sleep, keep the duration short to avoid blocking the user.
```

Update the JSON schema to include the new parameters and make `sideEffects` required.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 4: Commit**

```bash
git add src/prompt.ts templates/tools/bash.md
git commit -m "feat: add sideEffects and run_in_background to bash tool (DeepCode alignment)"
```

---

### Task 10: Edit Tool — Align `snippet_id` as Required

**Files:**
- Modify: `src/prompt.ts`
- Modify: `templates/tools/edit.md`

- [ ] **Step 1: Update edit tool definition in prompt.ts**

In the `getTools` function, update the edit tool (around line 524). Change `required` and update descriptions:

```typescript
{
  type: "function",
  function: {
    name: "edit",
    description: "Perform scoped string replacements in files.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to file. Optional when snippet_id is provided.",
        },
        snippet_id: {
          type: "string",
          description:
            "Snippet id returned by the Read or Edit tool to scope the search range. Defines the search scope. Provide file_path only as an optional guard.",
        },
        old_string: {
          type: "string",
          description: "Exact text to replace inside the file or snippet scope",
        },
        new_string: {
          type: "string",
          description: "Replacement text (must differ from old_string)",
        },
        replace_all: {
          type: "boolean",
          description: "Replace all occurences of old_string (default false)",
          default: false,
        },
        expected_occurrences: {
          type: "number",
          description: "Expected number of matches, especially useful as a safety check with replace_all",
        },
      },
      required: ["old_string", "new_string", "snippet_id"],
      additionalProperties: false,
    },
  },
},
```

- [ ] **Step 2: Update edit.md tool docs**

Update `templates/tools/edit.md` to reflect the new requirements:

```markdown
## Edit

Performs scoped string replacements in files.

Usage:
- You must use your `Read` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- snippet_id defines the search scope. Provide file_path only as an optional guard.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- If `old_string` is not unique, the tool returns candidate matches with line ranges, previews, and snippet ids that you can reuse in a follow-up edit.
- If `old_string` is not found, the tool returns the closest likely match in metadata, including a preview.
- `replace_all` has safety checks. For broad or short-fragment replacements, provide `expected_occurrences` so the tool can verify the exact number of matches before editing.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "file_path": {
      "description": "The absolute path to the file to modify (must be absolute, not relative). Optional when snippet_id is provided.",
      "type": "string"
    },
    "snippet_id": {
      "description": "Snippet id returned by Read or a prior Edit error response. Defines the search scope. Provide file_path only as an optional guard.",
      "type": "string"
    },
    "old_string": {
      "description": "The text to replace within the file or snippet scope",
      "type": "string"
    },
    "new_string": {
      "description": "The text to replace it with (must be different from old_string)",
      "type": "string"
    },
    "replace_all": {
      "description": "Replace all occurences of old_string (default false)",
      "default": false,
      "type": "boolean"
    },
    "expected_occurrences": {
      "description": "Expected number of matches. Useful as a guardrail for replace_all.",
      "type": "number"
    }
  },
  "required": [
    "old_string",
    "new_string",
    "snippet_id"
  ],
  "additionalProperties": false
}
```
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 4: Commit**

```bash
git add src/prompt.ts templates/tools/edit.md
git commit -m "feat: make snippet_id required in edit tool (DeepCode alignment)"
```

---

### Task 11: Tool Docs Templates Alignment

**Files:**
- Modify: `templates/tools/read.md.ejs`
- Modify: `templates/skills/karpathy-guidelines.md`

(Note: bash.md and edit.md were already updated in Tasks 9 and 10.)

- [ ] **Step 1: Simplify snippet_id description in read.md.ejs**

In `templates/tools/read.md.ejs`, update the snippet_id description (line 12):

Change:
```
- Text reads return a snippet id in metadata. You can pass that snippet id to the Edit tool to constrain replacements to just that read range.
```

This line is already correct — it matches DeepCode. No change needed.

Actually, let me re-check. The current content on line 12 says:
```
- Text reads return a snippet id in metadata. You can pass that snippet id to the Edit tool to constrain replacements to just that read range.
```

This matches the DeepCode spec. **No change needed for read.md.ejs.**

- [ ] **Step 2: Add "Internal use" line to karpathy-guidelines.md**

In `templates/skills/karpathy-guidelines.md`, add at the very end of the file:

```markdown

**Internal use:** Apply these guidelines silently. Do not cite this document, its title, or guideline names in user-facing responses.
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 4: Commit**

```bash
git add templates/skills/karpathy-guidelines.md
git commit -m "docs: add internal-use directive to karpathy-guidelines (DeepCode alignment)"
```

---

### Task 12: Date Format to Chinese

**Files:**
- Modify: `src/prompt.ts`

- [ ] **Step 1: Update `getCurrentDateAndModelPrompt` function**

In `src/prompt.ts`, replace the `getCurrentDateAndModelPrompt` function (around line 214):

```typescript
function getCurrentDateAndModelPrompt(model?: string): string {
  const date = new Date();
  let prompt = `今天是${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日。随着对话的进行，时间在流逝。`;
  prompt += model
    ? `\n当前LLM模型为${model}，对话中可通过/model命令切换模型。`
    : "";
  return prompt;
}
```

- [ ] **Step 2: Update runtime heading to Chinese**

In `getRuntimeContext` (around line 263), change the heading:

```typescript
// Before:
return `${getCurrentDateAndModelPrompt(model)}

# Workspace Environment

// After:
return `${getCurrentDateAndModelPrompt(model)}

# 本地工作区环境
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 4: Commit**

```bash
git add src/prompt.ts
git commit -m "feat: change date format and runtime heading to Chinese (DeepCode alignment)"
```

---

### Task 13: SkillPromptDocument Type Export

**Files:**
- Modify: `src/prompt.ts`

- [ ] **Step 1: Verify the type was already exported in Task 4**

The `SkillPromptDocument` type was added and exported in Task 4 (Step 2). Verify it exists:

Run: `grep -n "SkillPromptDocument" /Volumes/SamsungT7/git/cropcode/src/prompt.ts`

Expected output should show the type definition and any usages.

- [ ] **Step 2: No additional changes needed**

If Task 4 was completed correctly, this is already done. Skip to commit verification.

- [ ] **Step 3: Commit (if separate commit desired)**

If the spec requires a separate commit for this, it can be a no-op verification commit. Otherwise, this was already included in Task 4's commit.

---

### Task 14: System Prompt — Minimal Chinese Alignment

**Files:**
- Modify: `src/prompt.ts`
- Create: `templates/skills/agricultural-context.md` (optional, for moved content)

- [ ] **Step 1: Replace `SYSTEM_PROMPT_BASE` with minimal Chinese version**

In `src/prompt.ts`, replace the `SYSTEM_PROMPT_BASE` constant (lines 93-149) with:

```typescript
const SYSTEM_PROMPT_BASE = `你是一个在终端环境中工作的AI编码助手。你的角色是帮助用户完成软件工程任务。

当前工作目录是项目根目录。所有文件路径相对于此目录，除非另有说明。

不要运行修改或访问工作目录之外文件的命令，除非用户明确指示。`;
```

- [ ] **Step 2: Create agricultural-context skill template**

Create `templates/skills/agricultural-context.md`:

```markdown
---
name: agricultural-context
description: Agricultural domain context for CropCode. Provides guidance when working with agricultural data, crop models, and scientific datasets.
---

# Agricultural Context

When working with agricultural or scientific data:
- You have access to crop simulation models and weather data APIs.
- Validate units and formats. Common formats: FAO crop codes, ISO 8601 dates, WGS84 coordinates.
- Agricultural data often requires careful handling of missing values, seasonality, and spatial correlations.
```

- [ ] **Step 3: Add agricultural-context to default skill templates**

In `src/prompt.ts`, update the `DEFAULT_SKILL_TEMPLATES` array (around line 156):

```typescript
const DEFAULT_SKILL_TEMPLATES = ["agent-drift-guard.md", "agricultural-context.md", "karpathy-guidelines.md", "plan-and-execute.md"];
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: Passes.

- [ ] **Step 5: Test**

Run: `npm test`
Expected: All pass.

- [ ] **Step 6: Build**

Run: `npm run bundle`
Expected: Succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/prompt.ts templates/skills/agricultural-context.md
git commit -m "feat: adopt minimal Chinese system prompt (极简对齐, DeepCode alignment)"
```

---

## Final Verification

After all 14 tasks are complete:

- [ ] **Run full check suite**

```bash
npm run typecheck && npm test && npm run bundle
```

Expected: All pass.

- [ ] **Manual smoke test**

```bash
npm link
cropcode
```

Verify:
1. Welcome screen renders correctly
2. Keyboard shortcut tips appear
3. Provider/model/thinking/skills rows display
4. Type a simple prompt and verify tool calls work
5. Test `/model` command
6. Test `/resume` command

- [ ] **Verify git log**

```bash
git log --oneline -15
```

Expected: 14 commits, one per feature.
