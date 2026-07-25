## Bash

Executes a given bash command. Working directory persists between commands; shell state (everything else) does not. The shell environment is initialized from the user's profile (bash or zsh).

On Windows, Bash runs through Git Bash. Use POSIX commands and quote Windows paths carefully.

IMPORTANT: This tool is for terminal operations like git, npm, docker, etc. DO NOT use it for file operations (reading, writing, editing, searching, finding files) - use the specialized tools for this instead.

IMPORTANT: Before reaching for generic shell pipelines, prefer purpose-built CLI tools when they make the task more accurate, safer, faster, or easier to understand:
- Use `ripgrep` (`rg`) when you need to search file contents by text or regex across the workspace; prefer it over slower tools like `grep`.
- Use `jq` when you need to inspect, filter, or transform JSON output; prefer it over ad-hoc parsing with `sed`, `awk`, or Python one-liners.

Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use `ls` to verify the parent directory exists and is the correct location
   - For example, before running "mkdir foo/bar", first use `ls foo` to check that "foo" exists and is the intended parent directory

2. Command Execution:
   - Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
   - Examples of proper quoting:
     - cd "/Users/name/My Documents" (correct)
     - cd /Users/name/My Documents (incorrect - will fail)
     - python "/path/with spaces/script.py" (correct)
     - python /path/with spaces/script.py (incorrect - will fail)
   - After ensuring proper quoting, execute the command.
   - Capture the output of the command.

Usage notes:
  - The command argument is required.
  - The `sideEffects` parameter is required for every bash call. Choose the permission scope that best describes what the command does.
  - The `run_in_background` parameter is optional. Set to true to run this command in the background. You will be notified when it finishes. Only use this if you don't need the result immediately and are OK being notified when it completes. You do not need to use '&' at the end of the command when using this parameter.
    - If the command is long running and you would like to be notified when it finishes — use `run_in_background`.
    - Do not retry failing commands in a sleep loop — diagnose the root cause.
    - If waiting for a background task, you will be notified when it completes — do not poll.
    - If you must poll an external process, use a check command (e.g. `gh run view`) rather than sleeping first.
    - If you must sleep, keep the duration short to avoid blocking the user.
  - It is very helpful if you write a clear, concise description of what this command does. For simple commands, keep it brief (5-10 words). For complex commands (piped commands, obscure flags, or anything hard to understand at a glance), add enough context to clarify what it does.
  - If the output exceeds 30000 characters, output will be truncated before being returned to you.
  - Always prefer using the dedicated tools for these commands:
    - Read files: Use Read (NOT cat/head/tail)
    - Edit files: Use Edit (NOT sed/awk)
    - Write files: Use Write (NOT echo >/cat <<EOF)
    - Communication: Output text directly (NOT echo/printf)
  - When issuing multiple commands:
    - If the commands are independent and can run in parallel, make multiple Bash tool calls in a single message. For example, if you need to run "git status" and "git diff", send a single message with two Bash tool calls in parallel.
    - If the commands depend on each other and must run sequentially, use a single Bash call with '&&' to chain them together (e.g., `git add . && git commit -m "message" && git push`). For instance, if one operation must complete before another starts (like mkdir before cp, Write before Bash for git operations, or git add before git commit), run these operations sequentially instead.
    - Use ';' only when you need to run commands sequentially but don't care if earlier commands fail
    - DO NOT use newlines to separate commands (newlines are ok in quoted strings)
  - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of `cd`. You may use `cd` if the User explicitly requests it.
    <good-example>
    pytest /foo/bar/tests
    </good-example>
    <bad-example>
    cd /foo/bar && pytest tests
    </bad-example>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "command": {
      "description": "The command to execute",
      "type": "string"
    },
    "description": {
      "description": "Clear, concise description of what this command does in active voice. Never use words like \"complex\" or \"risk\" in the description - just describe what it does.\n\nFor simple commands (git, npm, standard CLI tools), keep it brief (5-10 words):\n- ls → \"List files in current directory\"\n- git status → \"Show working tree status\"\n- npm install → \"Install package dependencies\"\n\nFor commands that are harder to parse at a glance (piped commands, obscure flags, etc.), add enough context to clarify what it does:\n- find . -name \"*.tmp\" -exec rm {} \\; → \"Find and delete all .tmp files recursively\"\n- git reset --hard origin/main → \"Discard all local changes and match remote main\"\n- curl -s url | jq '.data[]' → \"Fetch JSON from URL and extract data array elements\"",
      "type": "string"
    },
    "sideEffects": {
      "description": "Permission scopes required by this bash command. Use [] only for commands that do not read, write, delete, or access the network. Use [\"unknown\"] when the effects cannot be classified safely. Required for every bash call.",
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "read-in-cwd",
          "read-out-cwd",
          "write-in-cwd",
          "write-out-cwd",
          "delete-in-cwd",
          "delete-out-cwd",
          "query-git-log",
          "mutate-git-log",
          "network",
          "unknown"
        ]
      }
    },
    "run_in_background": {
      "description": "Set to true to run this command in the background. You will be notified when it finishes. Only use this if you don't need the result immediately and are OK being notified when it completes. You do not need to use '&' at the end of the command when using this parameter.",
      "type": "boolean"
    },
    "stopCommand": {
      "description": "If run_in_background is true, an optional command to stop the background process (e.g. 'Ctrl+C', 'kill %1').",
      "type": "string"
    }
  },
  "required": [
    "command",
    "sideEffects"
  ],
  "additionalProperties": false
}
```
