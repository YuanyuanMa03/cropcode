# From first launch to a finished task

[Back to the homepage](../README-en.md) · [中文](quickstart.md)

This guide describes current source behavior. See the [changelog](../CHANGELOG.md) for differences from published releases. Replace example paths and tasks with your own project content.

## 1. Install and open your project

Prepare Node.js 22+ and an API key for your chosen provider:

```bash
npm install -g https://github.com/YuanyuanMa03/cropcode/releases/download/v2.2.0/cropcode-cli-2.2.0.tgz
cropcode --version
cd path/to/your/project
cropcode
```

To run current source, follow the [homepage instructions](../README-en.md#quick-start).

## 2. Connect a model

Without an API key configured, the login wizard opens automatically. With existing settings, enter `/login` to reopen it.

| Step | Action |
| --- | --- |
| Provider | Use arrow keys and `Enter` to choose DeepSeek, GLM, Qwen, MiMo, or LongCat |
| Connection type | Select the API or plan endpoint matching your key; this step is skipped when there is only one option |
| Model | Choose an initial model from the provider presets |
| API key | Paste the key and press `Enter`; input is masked |

Check the provider, model, thinking settings, and working directory in the welcome panel. Use `/model` to adjust the model and supported thinking controls. Saving a key does not validate it with the provider; actual requests determine access.

The model menu tries the configured `/models` endpoint and falls back to presets and the current model. See [provider details](providers.md). If changes do not take effect, check `CROPCODE_*` environment variables and `.cropcode/settings.json`, which override user settings and credentials. See [configuration](configuration_en.md).

## 3. Introduce the project

Type a task and press `Enter`. Use `@` to reference files:

```text
Read @README.md and explain the project's purpose, structure, and run instructions.
Do not modify files yet. Mark anything uncertain.
```

For research data:

```text
Inspect data/field_trial.csv for fields, missing values, repeated observations, and units.
List experimental-design questions that need my input. Preserve the source data.
```

Watch the streamed response and actual tool calls. CSV can be inspected as text; Excel and raster files generally require installed Python/R libraries or other tools.

![CropCode welcome screen and self-introduction](assets/cropcode-terminal.png)

*Real capture showing a skill load, documentation read, and the start of an answer. The background comes from the user's terminal configuration.*

## 4. Plan before implementation

Enter `/plan` or press `Shift+Tab`, then ask:

```text
Plan an R analysis based on the experimental design we verified.
Explain model choice, input checks, figures, and validation. Do not implement yet.
```

After a complete plan is returned, the `Plan ready` menu appears:

| Choice | Behavior |
| --- | --- |
| `1. implement this plan` | Leave Plan Mode and begin implementation |
| `2. clear context and implement` | Start a fresh session carrying the plan; the original session remains recoverable |
| `3. stay in Plan mode` | Continue discussing the plan |
| `4. switch to Default mode` | Leave Plan Mode without automatically implementing |

Press `1–4`, or use arrow keys and `Enter`. `Esc` stays in Plan Mode. If the model is still asking questions or has not returned a complete plan, continue the conversation.

Implementation uses file and Shell tools. Prompts depend on your [permission settings](permission_en.md); the default is `allowAll`, so not every file operation asks for confirmation. See [Plan Mode](plan-mode_en.md) for its specific rules.

## 5. Inspect deliverables

```text
Run the script, check that output files exist, and explain the checks.
List modified files, actual commands, and results.
Separately list failed runs, missing dependencies, and anything still unverified.
```

Inspect the actual files, command output, and plots, including units, experimental design, and statistical methods. An instruction to validate is not proof that validation succeeded.

## 6. Interrupt, resume, or undo

| Need | Control | Scope |
| --- | --- | --- |
| Interrupt generation | `Esc` | Does not undo completed file edits |
| Return later | `/resume` | Choose a session for the current project |
| Continue | `/continue` | Opens session selection when no active session exists |
| Explore another approach | `/fork` | Copies conversation context but shares the project directory; it does not create an isolated workspace |
| Restore a checkpoint | `/undo` | Restore tracked files, conversation, or both; external service actions are not reversed |
| Start a new topic | `/new` | Creates a new conversation |

[Session and checkpoint details →](session-persistence_en.md)

## Controls and command reference

| Key | Action |
| --- | --- |
| `Enter` | Send or confirm |
| `Shift+Enter` / `Ctrl+J` | Newline, subject to terminal key handling |
| `@` | Reference files |
| `/` | Open the command and skill menu |
| `Shift+Tab` | Toggle Plan Mode |
| `Esc` | Interrupt generation; close or return in menus |
| `Ctrl+V` | Paste an image, subject to terminal/system support and multimodal configuration |
| `Ctrl+R` | Change display mode |
| `Ctrl+D` twice | Quit |

| Command | Purpose |
| --- | --- |
| `/login` | Select provider and connection type |
| `/model` | Select model and supported thinking controls |
| `/plan` | Enter Plan Mode |
| `/init` | Generate project instructions in `AGENTS.md` |
| `/new` | Start a new conversation |
| `/resume` | Choose a previous session |
| `/fork` | Fork the current conversation |
| `/continue` | Continue the active conversation or choose a previous one |
| `/undo` | Restore file and/or conversation checkpoints |
| `/skills` | List available skills |
| `/mcp` | Inspect MCP server status and tools |
| `/raw` | Switch Normal / Lite / Raw display |
| `/exit` | Quit |

## Non-interactive execution

```bash
cropcode --exec --prompt "Summarize this repository and its test entry points without modifying files."
```

`--exec` runs one task. Using `-p` / `--prompt` alone opens the interactive interface with an initial prompt. Non-interactive mode cannot answer questions or permission prompts; handle these in an interactive session. Run `cropcode --help` for all options.

## Make workflows reusable

- **Project instructions:** use `/init` to record source data locations, units, output directories, and checks. [AGENTS.md](agents-md_en.md)
- **Reusable workflows:** write Skills for plotting conventions or data checks and inspect `/skills`. [Skills](agent-skills_en.md)
- **External tools:** configure MCP servers and inspect `/mcp`. [MCP](mcp_en.md)
- **Completion notifications:** configure your own notification script. [Notifications](notify_en.md)
