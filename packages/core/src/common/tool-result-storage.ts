import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const PERSIST_DIR_NAME = ".cropcode/tool-results";

export const BASH_PERSIST_THRESHOLD = 100_000;
export const EDIT_PERSIST_THRESHOLD = 100_000;
export const WRITE_PERSIST_THRESHOLD = 100_000;
export const PREVIEW_CHARS = 2000;

function ensurePersistDir(projectRoot: string): string {
  const dir = path.join(projectRoot, PERSIST_DIR_NAME);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * If content exceeds threshold, persist to disk and return a preview with file path.
 * Otherwise return the original content unchanged.
 */
export function maybePersistToolResult(content: string, threshold: number, projectRoot: string): string {
  if (content.length < threshold) return content;

  const dir = ensurePersistDir(projectRoot);
  const hash = hashContent(content);
  const filePath = path.join(dir, `${hash}.txt`);
  fs.writeFileSync(filePath, content, "utf8");

  const preview = content.slice(0, PREVIEW_CHARS);
  const tail = content.slice(-PREVIEW_CHARS);
  const total = formatBytes(Buffer.byteLength(content, "utf8"));

  return `<persisted-output path="${filePath}">\n${preview}\n... [full output saved, ${total} total] ...\n${tail}\n</persisted-output>`;
}

/**
 * Extract the last N complete lines from content.
 * Returns lines joined by newlines, preserving line boundaries.
 */
export function readLastLines(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;

  const tail = content.slice(-maxChars);
  const firstNewline = tail.indexOf("\n");
  if (firstNewline === -1) return tail;

  // Skip the first (potentially partial) line
  return tail.slice(firstNewline + 1);
}

/**
 * Truncate content with head + tail preservation, inserting a marker for the removed middle.
 * The tail portion preserves line boundaries for better readability.
 */
export function truncateWithTail(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;

  const half = Math.floor(maxChars / 2);
  const head = content.slice(0, half);
  const tail = readLastLines(content, half);
  const removed = content.length - head.length - tail.length;

  return `${head}\n\n... [truncated ${formatBytes(removed)} chars] ...\n\n${tail}`;
}
