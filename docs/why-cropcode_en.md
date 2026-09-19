# Why CropCode

> Design trade-offs, an objective comparison with mainstream tools, and current limitations

## Positioning

CropCode is an **open-source, multi-provider, terminal-native AI coding agent**. It belongs to the same category as Claude Code and Codex CLI: a model autonomously completing multi-step tasks inside an authorized tool environment. The difference is not "can it get work done" — it is the four design decisions below.

## Design decisions

### 1. A from-scratch harness, MIT-licensed

The agent loop, tool execution, permission gating, context compaction, and session persistence are all implemented in this repository, with no closed-source runtime. Direct consequences:

- **Auditable** — permission logic and context-trimming strategy are readable TypeScript; security-sensitive users can verify line by line
- **Modifiable** — adding tools, changing protocols, or altering defaults is an ordinary PR, not a fight with an upstream black box
- **Self-hostable** — runs fully inside private networks; no telemetry

### 2. Provider freedom

Four OpenAI-compatible providers (DeepSeek, Zhipu GLM, Qwen, Xiaomi MiMo) behind one interface:

- **Two billing models** — pay-as-you-go API keys alongside subscription plans (GLM/Qwen Coding Plan, MiMo Token Plan); switch with a three-step `/login`
- **Protocol adaptation** — deepseek vs qwen thinking formats, reasoning_effort ↔ thinking_budget mapping, and reasoning_content replay are handled in the core layer, invisible to the rest of the system
- **Direct connectivity** — all four provider APIs are reachable from mainland China without a proxy

### 3. Standardized skill distribution

Skills are knowledge packages in the standard `SKILL.md` format, distributed without a centralized store:

```bash
cropcode marketplace add <any Git repo or local path>
cropcode plugin install <skill-name>@<marketplace-name>
```

Any GitHub repository can serve as a marketplace. Skills activate automatically based on prompt intent — no manual enabling.

### 4. Research-workflow defaults

The project's origin is agricultural research: Python/R data analysis, LaTeX typesetting, publication figures. System prompts and bundled skills are tuned for that workflow — for example, automatic CJK font configuration for matplotlib.

## Comparison with mainstream tools

Only objectively verifiable dimensions; no capability scoring:

| Dimension | Claude Code | Codex CLI | Cursor | CropCode |
|-----------|-------------|-----------|--------|----------|
| License | Proprietary | Proprietary | Proprietary | **MIT** |
| Model provider | Anthropic | OpenAI | Several (in-subscription) | 4 Chinese providers, own keys |
| Billing | API / subscription | API / subscription | Subscription | Provider-native billing |
| Form factor | Terminal | Terminal | GUI IDE | Terminal |
| Extension mechanism | Plugins + MCP | AGENTS.md + MCP | Extension market | SKILL.md + community marketplace + MCP |
| Direct access from mainland China | Proxy needed | Proxy needed | Partial | All direct |
| Ecosystem maturity | High | High | High | Early |

## Current limitations

Gaps we do not hide (as of v2.1.0):

- **Single agent loop** — no parallel subagents yet; complex tasks run serially
- **Web access centers on WebSearch** — no built-in page-fetch tool; WebSearch relies on a custom script or LLM-side search
- **Early ecosystem** — few community marketplace skills so far; the product leans on core capability rather than plugin breadth

## When to choose CropCode

| Your situation | Recommendation |
|----------------|----------------|
| In mainland China, no proxy | CropCode |
| Want Chinese providers with switching freedom | CropCode |
| Need MIT / auditable / private deployment | CropCode |
| Research data analysis + paper writing | CropCode |
| Want the strongest models and most mature ecosystem | Claude Code / Cursor |
| Heavy GPT-ecosystem user | Codex CLI |
| Prefer a GUI editor | Cursor / Copilot |

## Technical credibility

- **372 tests** (core 190 + cli 182) covering tool execution, session management, streaming, permission evaluation, compaction strategy
- **CI matrix**: 3 OS × 3 Node versions (9 jobs)
- **Architecture document**: [architecture.md](architecture.md) (Chinese) with full data flow, module breakdown, and design decisions
