# Agent Intelligence Overhaul Design

> Principle: Copy Claude Code's proven patterns directly. Innovate only where Claude Code's approach is suboptimal for CropCode's multi-provider, agricultural-domain context.

## Problem

CropCode feels "笨笨的" compared to Claude Code and Codex, even with the same models (GLM-5.1, DeepSeek V4). Root causes:

1. **System prompt** — Chinese, short (~150 lines), lacks precise behavioral constraints
2. **Tool results** — Head-only truncation loses critical tail info; no truncation warnings
3. **Context management** — Microcompact destroys data irreversibly; no post-compact re-injection
4. **Unnecessary LLM calls** — Skill matching, web search prep, edit fallback all waste API roundtrips
5. **No prompt caching strategy** — Entire system prompt reprocessed every turn

## Design

### Module 1: System Prompt Overhaul

**Source: Claude Code `src/constants/prompts.ts` — 20 modular sections**

Restructure CropCode's system prompt to match Claude Code's modular architecture. Write in English for maximum model compliance across all providers (DeepSeek, GLM, Qwen, MiMo).

#### Section Structure (in order)

```
1. Identity
   "You are CropCode, an open-source AI coding assistant specialized in
    agricultural research but capable of general-purpose software engineering.
    You help researchers and developers with coding, data analysis, crop
    simulation, and any software task."

2. System Rules
   - Markdown formatting (GFM)
   - Tool priority: dedicated tools (Read/Edit/Write) > Bash
   - Permission modes explanation
   - System reminder tag handling
   - Prompt injection awareness

3. Doing Tasks
   - Read files before modifying — never blind-edit
   - Prefer Edit over Write for existing files
   - Run typecheck/tests after changes
   - No unnecessary comments, no over-engineering
   - No speculative abstractions, no premature error handling
   - Default to writing no comments — only add when WHY is non-obvious
   - Verify before reporting done (for UI/frontend changes, test in browser)
   - Security: no command injection, XSS, SQL injection

4. Executing Actions
   - Consider reversibility and blast radius
   - Destructive ops (rm -rf, force push, drop table) — confirm first
   - Never skip safety checks (git hooks, pre-commit)
   - When blocked by hooks, fix underlying issue, don't bypass

5. Using Your Tools
   - NEVER use cat/head/tail — use Read tool
   - NEVER use echo/cat/printf for writing — use Write tool
   - NEVER use sed/awk for editing — use Edit tool
   - ALWAYS read a file before editing it
   - Prefer Edit for modifications, Write only for new files
   - Use rg (ripgrep) for searching, not grep
   - Independent reads can be parallel; dependent ops must be serial
   - When bash fails, analyze error before retrying — do not retry same command

6. Communication Style
   - Respond in user's language (Chinese by default for CropCode users)
   - Keep technical terms in English
   - Be concise — one sentence per update
   - Reference code with file_path:line_number format
   - No emoji unless user requests
   - Don't narrate internal deliberation

7. Runtime Context (dynamic, per-session)
   - Date, model name, OS info, shell path, tool availability
   - Project root, working directory, git status
```

#### Default Skills Consolidation

**Current**: 3 always-injected skills (~470 lines): agent-drift-guard, plan-and-execute, karpathy-guidelines

**Change**: Merge their essential rules into the main prompt sections above. Kill separate injection.

| Skill | What to keep | Where it goes |
|-------|-------------|---------------|
| agent-drift-guard | "Don't expand scope", "Most direct fix first" | Section 3 Doing Tasks |
| plan-and-execute | "Use UpdatePlan for multi-step tasks", task state symbols | Section 3 Doing Tasks |
| karpathy-guidelines | "Think before coding", "Simplicity first", "Surgical changes" | Section 3 Doing Tasks |

**Why**: The 3 skills consume ~470 lines of context but duplicate rules already in the main prompt. Consolidating saves context tokens and reduces confusion about priority.

**Innovation**: CropCode-specific — add a brief agriculture section:
```
8. Agricultural Context (when relevant)
   - You have access to crop simulation models and weather data APIs
   - When working with agricultural data, validate units and formats
   - Common formats: FAO crop codes, ISO 8601 dates, WGS84 coordinates
```

#### Tool Documentation Templates

Change `templates/tools/*.md` to English. Add anti-pattern examples matching Claude Code's style.

### Module 2: Tool Result Quality

**Source: Claude Code `packages/builtin-tools/src/tools/`**

#### 2a) Bash Output: Head+Tail Truncation with Persistence

**Claude Code approach**: Accumulate up to 2MB, head-only truncation, persist large results to disk with 2KB preview.

**CropCode innovation (Claude Code's head-only truncation is a weakness)**:

Bash output truncation is one place where Claude Code's design is suboptimal — they keep the head and lose the tail, which drops error summaries and test results. We do better:

```
MAX_OUTPUT_CHARS = 50_000  (up from 30K)

When output exceeds limit:
  - First 20K chars
  - "\n... [truncated N chars] ...\n"
  - Last 20K chars

When output exceeds PERSIST_THRESHOLD (100K chars):
  - Save full output to .cropcode/tool-results/<hash>.txt
  - Return preview (first 2K + last 2K) with file path:
    <tool-result path=".cropcode/tool-results/abc123.txt">
    [first 2000 chars]
    ... [full output saved, 234KB total] ...
    [last 2000 chars]
    </tool-result>
```

**Why head+tail is better**: Commands like `npm test`, `cargo build`, `pip install` put the most important info (error summary, failure count) at the end. Claude Code loses this; we preserve it.

#### 2b) Read Tool: Token-Aware with Explicit Truncation Warnings

**Claude Code approach**: Pre-estimate token count, reject if over 25K tokens, force user to use offset/limit.

**Copy Claude Code directly**:

```typescript
const MAX_READ_TOKENS = 25_000;

// Before reading, estimate tokens
const estimatedTokens = content.length / 4; // rough estimate
if (estimatedTokens > MAX_READ_TOKENS && !offset && !limit) {
  return {
    ok: false,
    error: `File too large (~${estimatedTokens} tokens, limit ${MAX_READ_TOKENS}). ` +
           `Use offset/limit to read specific sections. Total lines: ${totalLines}. ` +
           `Suggestion: read with offset=1, limit=500`
  };
}
```

When partial read is used (offset/limit provided), append truncation notice:
```
// At end of output, if file has more lines:
[File has ${totalLines} total lines. Shown lines ${start}-${end}. Use offset=${end+1} to continue reading.]
```

For long lines (>2000 chars), add truncation marker:
```
... [line truncated, ${originalLength} chars total]
```

#### 2c) Edit Tool: Remove LLM Fallback Calls

**Claude Code approach**: Exact match only. No LLM correction. Clear error on failure.

**Copy Claude Code**:

Remove layers 3-4 (loose escape + LLM correction + LLM diagnosis). Keep:
1. Exact match
2. Tab correction (strip leading tabs from line-number-formatted content)

On failure, return clear error:
```
old_string not found in /path/to/file. The file may have changed since you last read it.
Re-read the file and try again with the exact text from the Read output.
```

**Why**: The LLM fallback calls add 1-2 extra API roundtrips per edit failure. The model is perfectly capable of re-reading the file and correcting the string itself — Claude Code proves this works.

#### 2d) Tool Result Format Standardization

All tool results returned to the model follow this format:

Success:
```
[Tool-specific output, e.g. "Replaced 1 occurrence in /path/to/file."]
```

Failure:
```
<error>
[Clear error message with actionable guidance]
</error>
```

Truncation:
```
[output before truncation]
... [truncated N chars] ...
[output after truncation]
```

### Module 3: Context Management

**Source: Claude Code `src/services/compact/` — 7-layer system**

#### 3a) Tool Result Persistence (NEW)

**Copy Claude Code's `toolResultStorage.ts`**:

```typescript
// .cropcode/tool-results/ directory
const PERSIST_DIR = ".cropcode/tool-results";
const BASH_PERSIST_THRESHOLD = 100_000;  // chars
const EDIT_PERSIST_THRESHOLD = 100_000;
const WRITE_PERSIST_THRESHOLD = 100_000;
const PREVIEW_CHARS = 2000;

function maybePersistToolResult(toolName: string, content: string, threshold: number): string {
  if (content.length < threshold) return content;

  const hash = hashContent(content);
  const filePath = path.join(PERSIST_DIR, `${hash}.txt`);
  fs.writeFileSync(filePath, content);

  const preview = content.slice(0, PREVIEW_CHARS);
  const tail = content.slice(-PREVIEW_CHARS);
  return `<persisted-output path="${filePath}">\n${preview}\n... [full output saved, ${formatBytes(content.length)} total] ...\n${tail}\n</persisted-output>`;
}
```

#### 3b) Microcompact: Raise Thresholds + Post-Compact Re-Injection

**Claude Code approach**: Replace old tool results with `[Old tool result content cleared]`. Post-compact re-injects recently-read files.

**Copy the re-injection pattern. Adapt the thresholds**:

```typescript
// Current values → New values
MICROCOMPACT_TRIGGER_THRESHOLD = 20  // was 10
MICROCOMPACT_KEEP_RECENT = 10        // was 5

// Post-compact re-injection (NEW)
const MAX_REINJECTED_FILES = 5;
const MAX_REINJECT_TOKENS = 50_000;

function reInjectAfterCompact(messages: SessionMessage[]): SessionMessage[] {
  const recentlyRead = getRecentlyReadFiles(messages, MAX_REINJECTED_FILES);
  if (recentlyRead.length === 0) return messages;

  const reInjection = {
    role: "system",
    content: "Recently read files (re-injected after context compaction):\n\n" +
      recentlyRead.map(f => `## ${f.path}\n${f.content}`).join("\n\n")
  };
  return [...messages, reInjection];
}
```

#### 3c) Full Compact: Re-Inject Critical Context

**Copy Claude Code's post-compact re-injection**:

After full compaction summarization, re-inject:
1. Recently-read files (up to 5, within 50K token budget)
2. Active plan (if any UpdatePlan records exist)
3. Matched skill documents

This ensures the model doesn't "forget" the code it was working on after compaction.

#### 3d) Compaction Summary Model

**Claude Code**: Uses a separate Haiku model for summarization to save cost.

**CropCode innovation**: Since CropCode supports multiple providers, use the cheapest available model for compaction:

```typescript
function getCompactionModel(): string {
  // Use flash/lite tier if available, otherwise fall back to current model
  const cheapModels = ["glm-4.7-flash", "deepseek-chat", "qwen-turbo"];
  for (const model of cheapModels) {
    if (isModelAvailable(model)) return model;
  }
  return currentModel; // fallback
}
```

### Module 4: Performance Optimizations

#### 4a) Eliminate Unnecessary LLM Calls

**Skill matching** — currently calls LLM to match user prompt to skills.

**Change**: Keyword/file-name matching. No LLM call.

```typescript
function matchSkills(userPrompt: string): string[] {
  const prompt = userPrompt.toLowerCase();
  return availableSkills.filter(skill => {
    const keywords = skill.keywords ?? extractKeywordsFromSkillName(skill.name);
    return keywords.some(kw => prompt.includes(kw));
  });
}
```

**Web search** — currently makes 1-3 LLM calls for language detection and translation.

**Change**: Use the language of the user's prompt directly. No LLM calls before search.

**Edit fallback** — eliminated in Module 2c.

#### 4b) Prompt Cache-Friendly Structure

**Copy Claude Code's cache-aware prompt assembly**:

Split system prompt into:
- **Static block**: Identity + System Rules + Doing Tasks + Using Tools + Communication Style (rarely changes → high cache hit)
- **Dynamic block**: Runtime Context + Agent Instructions + Matched Skills (changes per session)

The OpenAI-compatible API doesn't support Anthropic-style prompt caching, but structuring the prompt this way:
1. Minimizes diffs between turns (tools sorted alphabetically — already done)
2. Makes future cache implementation straightforward when providers add support
3. Reduces the total prompt size by consolidating skills

#### 4c) Streaming Tool Execution

**Claude Code**: StreamingToolExecutor starts executing tools as they stream in, before the full response completes.

**Defer to later phase**: This is a complex change. Not in scope for initial improvement. Keep current "wait for full response, then execute tools" approach.

### Module 5: Model-Specific Adaptations

#### 5a) Multimodal Support

**Enable multimodal for GLM-5.1** (currently disabled):

```typescript
// provider-presets.ts
{ id: "glm-5.1", multimodal: true, ... }  // was: multimodal not set (defaults to false)
```

Verify multimodal support for other recent models (DeepSeek V4, Qwen 3) and enable where supported.

#### 5b) Thinking Budget Optimization

**Current**: DeepSeek/GLM use `reasoning_effort: "high"|"max"`. Qwen uses `thinking_budget: 5000|10000`.

**Change**: Map reasoning efforts to higher budgets:

| Effort | DeepSeek/GLM | Qwen budget |
|--------|-------------|-------------|
| high | reasoning_effort: "high" | thinking_budget: 10000 |
| max | reasoning_effort: "max" | thinking_budget: 32000 |

Qwen's current 5000/10000 budgets are too conservative. Increase to match the depth of reasoning that makes agents effective.

## Implementation Priority

| Phase | Modules | Impact | Effort |
|-------|---------|--------|--------|
| 1 | System prompt (Module 1) | Highest — directly affects all model behavior | Medium |
| 2 | Tool results (Module 2) | High — fixes truncation and edit issues | Medium |
| 3 | Context management (Module 3) | High — fixes "forgetting" in long sessions | High |
| 4 | Performance (Module 4a, 4b) | Medium — reduces latency | Low |
| 5 | Model adaptations (Module 5) | Low — incremental improvements | Low |

## Files to Modify

| File | Changes |
|------|---------|
| `src/prompt.ts` | Rewrite system prompt assembly |
| `templates/tools/*.md` | Rewrite in English with anti-patterns |
| `templates/skills/agent-drift-guard.md` | Remove (merged into main prompt) |
| `templates/skills/plan-and-execute.md` | Remove (merged into main prompt) |
| `templates/skills/karpathy-guidelines.md` | Remove (merged into main prompt) |
| `src/tools/bash-handler.ts` | Head+tail truncation + persistence |
| `src/tools/read-handler.ts` | Token-aware rejection + truncation warnings |
| `src/tools/edit-handler.ts` | Remove LLM fallback layers |
| `src/tools/write-handler.ts` | Result persistence |
| `src/session.ts` | Microcompact thresholds + re-injection + compact re-injection |
| `src/common/tool-result-storage.ts` | NEW — persistence mechanism |
| `src/common/model-capabilities.ts` | Updated thresholds |
| `src/common/provider-presets.ts` | GLM-5.1 multimodal, Qwen thinking budgets |
| `src/common/openai-thinking.ts` | Qwen budget increase |

## What We're NOT Changing

- Overall architecture (React/Ink TUI, OpenAI-compatible API)
- Permission system
- MCP integration
- Marketplace system
- Agricultural models
- UI components
- The agentic loop structure (for loop in activateSession)
