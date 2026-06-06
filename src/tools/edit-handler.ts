import * as fs from "fs";
import { z } from "zod";
import type { ToolExecutionContext, ToolExecutionResult } from "./executor";
import {
  buildDiffPreview,
  hasFileChangedSinceState,
  readTextFileWithMetadata,
  writeTextFile,
} from "../common/file-utils";
import { executeValidatedTool, semanticBoolean } from "../common/runtime";
import {
  createSnippet,
  getFileState,
  getSnippet,
  hasSnippetOutdatedFileVersion,
  isAbsoluteFilePath,
  isFullFileView,
  normalizeFilePath,
  recordFileState,
} from "../common/state";

const MAX_CANDIDATE_COUNT = 5;
const REPLACE_ALL_MATCH_THRESHOLD = 5;
const SHORT_REPLACE_ALL_LENGTH = 40;
const OUTDATED_SNIPPET_NOT_FOUND_ERROR =
  "old_string was not found in this snippet scope. The file has changed since this snippet was created. Read the file again before editing.";

type LineIndex = {
  lines: string[];
  lineStarts: number[];
};

type SearchScope = {
  filePath: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  snippetId: string | null;
};

type MatchOccurrence = {
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
};

const editSchema = z.strictObject({
  file_path: z.string().optional(),
  snippet_id: z.string().optional(),
  old_string: z.string(),
  new_string: z.string(),
  replace_all: semanticBoolean(false).optional(),
  expected_occurrences: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (typeof value === "string") {
      return Number(value);
    }
    return value;
  }, z.number().int().min(1, "expected_occurrences must be >= 1.").optional()),
});

export async function handleEditTool(
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  return executeValidatedTool(
    "edit",
    editSchema,
    args,
    context,
    async (input) => {
      const snippetId = input.snippet_id?.trim() ?? "";
      const snippet = snippetId ? getSnippet(context.sessionId, snippetId) : null;

      let filePath = input.file_path?.trim() ?? "";
      if (!filePath && !snippet) {
        return {
          ok: false,
          name: "edit",
          error: 'Missing required "file_path" string or "snippet_id" string.',
        };
      }

      if (!filePath && snippet) {
        filePath = snippet.filePath;
      }

      filePath = normalizeFilePath(filePath);
      if (!isAbsoluteFilePath(filePath)) {
        return {
          ok: false,
          name: "edit",
          error: "file_path must be an absolute path.",
        };
      }

      if (snippetId && !snippet) {
        return {
          ok: false,
          name: "edit",
          error: `Unknown snippet_id: ${snippetId}`,
        };
      }

      if (snippet && snippet.filePath !== filePath) {
        return {
          ok: false,
          name: "edit",
          error: "snippet_id does not belong to the provided file_path.",
        };
      }

      if (input.old_string === "") {
        return {
          ok: false,
          name: "edit",
          error: "old_string must not be empty.",
        };
      }

      if (input.old_string === input.new_string) {
        return {
          ok: false,
          name: "edit",
          error: "new_string must differ from old_string.",
        };
      }

      if (!fs.existsSync(filePath)) {
        return {
          ok: false,
          name: "edit",
          error: `File not found: ${filePath}`,
        };
      }

      let stat: fs.Stats;
      try {
        stat = fs.statSync(filePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          name: "edit",
          error: `Failed to stat file: ${message}`,
        };
      }

      if (stat.isDirectory()) {
        return {
          ok: false,
          name: "edit",
          error: "file_path points to a directory.",
        };
      }

      const fileState = getFileState(context.sessionId, filePath);
      if (!fileState) {
        return {
          ok: false,
          name: "edit",
          error: "Must read file before editing.",
        };
      }

      if (!snippet && !isFullFileView(fileState)) {
        return {
          ok: false,
          name: "edit",
          error: "File was only partially read. Use snippet_id or read the full file before editing.",
        };
      }

      if (hasFileChangedSinceState(filePath, fileState)) {
        return {
          ok: false,
          name: "edit",
          error: "File has been modified since read. Read it again before editing.",
        };
      }

      try {
        const metadata = readTextFileWithMetadata(filePath);
        const raw = metadata.content;
        const oldString = input.old_string;
        const newString = input.new_string;
        const replaceAll = input.replace_all ?? false;
        const lineIndex = buildLineIndex(raw);
        const scope = buildSearchScope(filePath, raw, lineIndex, snippet ?? null);
        let matches = findOccurrences(raw, oldString, scope);
        let matchedVia: "exact" | "line_leading_tab_correction" = "exact";
        let replacementOldString = oldString;
        let replacementNewString = newString;

        if (matches.length === 0) {
          const tabStrippedOldString = stripReadResultLineTabs(oldString);
          if (tabStrippedOldString !== oldString) {
            const tabStrippedMatches = findOccurrences(raw, tabStrippedOldString, scope);
            if (tabStrippedMatches.length === 1) {
              matches = tabStrippedMatches;
              matchedVia = "line_leading_tab_correction";
              replacementOldString = tabStrippedOldString;
              replacementNewString = stripReadResultLineTabs(newString);
            }
          }
        }

        if (matches.length === 0) {
          if (snippet && hasSnippetOutdatedFileVersion(context.sessionId, snippet)) {
            return {
              ok: false,
              name: "edit",
              error: OUTDATED_SNIPPET_NOT_FOUND_ERROR,
              metadata: {
                scope: formatScopeMetadata(scope),
              },
            };
          }

          return {
            ok: false,
            name: "edit",
            error: "old_string not found in file.",
            metadata: {
              scope: formatScopeMetadata(scope),
            },
          };
        }

        if (!replaceAll && matches.length > 1) {
          return {
            ok: false,
            name: "edit",
            error: "old_string is not unique; use snippet_id, replace_all, or provide more context.",
            metadata: {
              match_count: matches.length,
              scope: formatScopeMetadata(scope),
              candidates: buildCandidateMetadata(context.sessionId, filePath, raw, matches),
            },
          };
        }

        const expectedOccurrences = input.expected_occurrences ?? null;
        const replaceAllGuardError = validateReplaceAllGuard({
          replaceAll,
          matchCount: matches.length,
          oldString: replacementOldString,
          expectedOccurrences,
        });
        if (replaceAllGuardError) {
          return {
            ok: false,
            name: "edit",
            error: replaceAllGuardError,
            metadata: {
              match_count: matches.length,
              scope: formatScopeMetadata(scope),
              candidates: buildCandidateMetadata(context.sessionId, filePath, raw, matches),
            },
          };
        }

        const updated = applyReplacement(raw, replacementNewString, matches, replaceAll);
        const diffPreview = buildDiffPreview(filePath, raw, updated);
        context.onBeforeFileMutation?.(filePath);
        writeTextFile(filePath, updated, metadata.encoding, metadata.lineEndings);
        context.onAfterFileMutation?.(filePath);
        const freshMetadata = readTextFileWithMetadata(filePath);
        recordFileState(
          context.sessionId,
          {
            filePath,
            content: freshMetadata.content,
            timestamp: freshMetadata.timestamp,
            encoding: freshMetadata.encoding,
            lineEndings: freshMetadata.lineEndings,
          },
          { incrementVersion: true }
        );
        const replacedCount = replaceAll ? matches.length : 1;
        return {
          ok: true,
          name: "edit",
          output: `Replaced ${replacedCount} occurrence(s) in ${filePath}.`,
          metadata: {
            file_path: filePath,
            replaced_count: replacedCount,
            matched_via: matchedVia,
            cache_refreshed: true,
            read_scope_type: snippet ? "snippet" : "full",
            encoding: freshMetadata.encoding,
            line_endings: freshMetadata.lineEndings,
            diff_preview: diffPreview,
            scope: formatScopeMetadata(scope),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          name: "edit",
          error: message,
        };
      }
    },
    {
      preprocess: (rawInput) => {
        const nextInput = { ...rawInput };
        if (typeof nextInput.file_path === "string") {
          nextInput.file_path = normalizeFilePath(nextInput.file_path);
        }
        if (typeof nextInput.snippet_id === "string") {
          nextInput.snippet_id = nextInput.snippet_id.trim();
        }
        return { ok: true, input: nextInput };
      },
    }
  );
}

function buildLineIndex(raw: string): LineIndex {
  const lines = raw.split(/\r?\n/);
  const lineStarts = new Array<number>(lines.length + 2).fill(raw.length);
  let cursor = 0;

  for (let index = 0; index < lines.length; index += 1) {
    lineStarts[index + 1] = cursor;
    cursor += lines[index].length;
    if (index < lines.length - 1) {
      if (raw.slice(cursor, cursor + 2) === "\r\n") {
        cursor += 2;
      } else if (raw[cursor] === "\n") {
        cursor += 1;
      }
    }
  }

  lineStarts[lines.length + 1] = raw.length;
  return { lines, lineStarts };
}

function buildSearchScope(
  filePath: string,
  raw: string,
  lineIndex: LineIndex,
  snippet: { startLine: number; endLine: number; id: string } | null
): SearchScope {
  if (!snippet) {
    return {
      filePath,
      startOffset: 0,
      endOffset: raw.length,
      startLine: 1,
      endLine: lineIndex.lines.length,
      snippetId: null,
    };
  }

  const safeStartLine = clamp(snippet.startLine, 1, lineIndex.lines.length);
  const safeEndLine = clamp(snippet.endLine, safeStartLine, lineIndex.lines.length);
  return {
    filePath,
    startOffset: lineIndex.lineStarts[safeStartLine],
    endOffset: lineIndex.lineStarts[safeEndLine + 1],
    startLine: safeStartLine,
    endLine: safeEndLine,
    snippetId: snippet.id,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findOccurrences(raw: string, needle: string, scope: SearchScope): MatchOccurrence[] {
  if (!raw || !needle) {
    return [];
  }

  const scopeText = raw.slice(scope.startOffset, scope.endOffset);
  const matches: MatchOccurrence[] = [];
  let searchIndex = 0;

  while (true) {
    const found = scopeText.indexOf(needle, searchIndex);
    if (found === -1) {
      break;
    }
    const startOffset = scope.startOffset + found;
    const endOffset = startOffset + needle.length;
    matches.push({
      startOffset,
      endOffset,
      startLine: offsetToLine(raw, startOffset),
      endLine: offsetToLine(raw, Math.max(startOffset, endOffset - 1)),
    });
    searchIndex = found + needle.length;
  }

  return matches;
}

function offsetToLine(raw: string, offset: number): number {
  if (offset <= 0) {
    return 1;
  }
  let line = 1;
  for (let index = 0; index < raw.length && index < offset; index += 1) {
    if (raw[index] === "\n") {
      line += 1;
    }
  }
  return line;
}

function validateReplaceAllGuard(input: {
  replaceAll: boolean;
  matchCount: number;
  oldString: string;
  expectedOccurrences: number | null;
}): string | null {
  if (!input.replaceAll) {
    if (input.expectedOccurrences !== null && input.expectedOccurrences !== 1) {
      return "expected_occurrences can only be greater than 1 when replace_all is true.";
    }
    return null;
  }

  if (input.expectedOccurrences !== null && input.expectedOccurrences !== input.matchCount) {
    return `replace_all expected ${input.expectedOccurrences} occurrence(s), ` + `but found ${input.matchCount}.`;
  }

  const isShortFragment = input.oldString.trim().length < SHORT_REPLACE_ALL_LENGTH;
  const needsExplicitCount =
    input.expectedOccurrences === null &&
    (input.matchCount > REPLACE_ALL_MATCH_THRESHOLD || (isShortFragment && input.matchCount > 1));

  if (needsExplicitCount) {
    return (
      `replace_all would affect ${input.matchCount} occurrence(s); ` +
      "provide expected_occurrences to confirm this broader replacement."
    );
  }

  return null;
}

function applyReplacement(raw: string, newString: string, matches: MatchOccurrence[], replaceAll: boolean): string {
  if (!replaceAll) {
    return raw.slice(0, matches[0].startOffset) + newString + raw.slice(matches[0].endOffset);
  }

  let result = "";
  let cursor = 0;
  for (const match of matches) {
    result += raw.slice(cursor, match.startOffset);
    result += newString;
    cursor = match.endOffset;
  }
  result += raw.slice(cursor);
  return result;
}

function stripReadResultLineTabs(value: string): string {
  return value.replaceAll("\n\t", "\n");
}

function buildCandidateMetadata(
  sessionId: string,
  filePath: string,
  raw: string,
  matches: MatchOccurrence[]
): Array<Record<string, unknown>> {
  return matches.slice(0, MAX_CANDIDATE_COUNT).map((match) => {
    const preview = buildPreview(raw, match.startLine, match.endLine);
    const snippet = createSnippet(sessionId, filePath, match.startLine, match.endLine, preview);
    return {
      snippet_id: snippet?.id ?? null,
      start_line: match.startLine,
      end_line: match.endLine,
      preview,
    };
  });
}

function formatScopeMetadata(scope: SearchScope): Record<string, unknown> {
  return {
    file_path: scope.filePath,
    start_line: scope.startLine,
    end_line: scope.endLine,
    snippet_id: scope.snippetId,
  };
}

function buildPreview(raw: string, startLine: number, endLine: number): string {
  const lines = raw.split(/\r?\n/);
  const selected = lines.slice(startLine - 1, endLine);
  return formatWithLineNumbers(selected, startLine);
}

function formatWithLineNumbers(lines: string[], startLine: number): string {
  return lines.map((line, index) => `${String(startLine + index).padStart(6, " ")}\t${line}`).join("\n");
}
