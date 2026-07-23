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
