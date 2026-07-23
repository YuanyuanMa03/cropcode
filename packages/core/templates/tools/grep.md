# Grep Tool

Search file contents using ripgrep. Supports regex patterns, file type filtering, and context lines.

## Parameters

```json
{
  "pattern": "string (required) - regex pattern to search for",
  "path": "string (optional) - file or directory to search in (default: project root)",
  "glob": "string (optional) - glob filter, e.g. '*.ts', '*.{ts,tsx}'",
  "output_mode": "string (optional) - 'files_with_matches' | 'content' | 'count' (default: 'files_with_matches')",
  "i": "boolean (optional) - case insensitive search",
  "context": "number (optional) - lines of context before and after match",
  "B": "number (optional) - lines before match",
  "A": "number (optional) - lines after match",
  "type": "string (optional) - file type filter (js, ts, py, rust, go, etc.)",
  "head_limit": "number (optional) - max results (default: 250, 0 = unlimited)",
  "offset": "number (optional) - skip first N results (pagination)"
}
```

## Guidelines

- Use `output_mode: 'files_with_matches'` to find which files contain a pattern.
- Use `output_mode: 'content'` to see matching lines with context.
- Use `output_mode: 'count'` to count matches per file.
- Use `glob` to narrow search to specific file types.
- Use `type` for language-specific searches (faster than glob for common languages).
- If results are truncated, use `offset` to paginate.
- Avoid very broad patterns that match too many files.
