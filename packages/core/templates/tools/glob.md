# Glob Tool

Fast file pattern matching. Use to find files by name pattern.

## Parameters

```json
{
  "pattern": "string (required) - glob pattern, e.g. '*.ts', '**/*.test.js'",
  "path": "string (optional) - directory to search in (default: project root)",
  "head_limit": "number (optional) - max results (default: 250, 0 = unlimited)"
}
```

## Guidelines

- Use glob to find files by name pattern when you don't need to search file contents.
- Prefer glob over bash `find` for file discovery.
- Common patterns: `*.ts`, `*.tsx`, `**/*.test.*`, `src/**/*.py`.
- If results are truncated, use `head_limit` and `offset` to paginate.
