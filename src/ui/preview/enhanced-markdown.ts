/**
 * Enhanced Markdown → terminal rendering with table support.
 *
 * Extends the existing renderMarkdown with:
 * - GFM-style tables
 * - Task lists (- [ ] / - [x])
 * - Horizontal rules
 */

import chalk from "chalk";

// ── GFM Table parsing ─────────────────────────────────────────

type MarkdownTable = {
  headers: string[];
  alignments: ("left" | "center" | "right")[];
  rows: string[][];
};

function parseMarkdownTable(lines: string[], startIdx: number): MarkdownTable | null {
  // Header line
  const headerLine = lines[startIdx];
  if (!headerLine?.includes("|")) return null;

  // Separator line must follow header
  const sepLine = lines[startIdx + 1];
  if (!sepLine?.match(/^\|?[\s:-]+\|[\s|:-]+\|?$/)) return null;

  const headers = headerLine
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const alignments = sepLine
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .map((c) => {
      if (c.startsWith(":") && c.endsWith(":")) return "center" as const;
      if (c.endsWith(":")) return "right" as const;
      return "left" as const;
    });

  // Data rows
  const rows: string[][] = [];
  for (let i = startIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.includes("|")) break;
    rows.push(
      line
        .split("|")
        .map((c) => c.trim())
        .filter((_, idx) => idx < headers.length)
    );
  }

  if (rows.length === 0) return null;
  return { headers, alignments, rows };
}

function renderMarkdownTable(table: MarkdownTable): string {
  // Calculate column widths
  const widths = table.headers.map((h, i) => {
    let max = displayWidth(h);
    for (const row of table.rows) {
      const val = row[i] ?? "";
      max = Math.max(max, displayWidth(val));
    }
    return Math.min(max, 30);
  });

  const sepLine = widths.map((w) => "─".repeat(w + 2)).join("┼");

  const lines: string[] = [];

  // Header
  const hCells = table.headers.map((h, i) => padCell(chalk.bold(h), widths[i], table.alignments[i])).join(" │ ");
  lines.push(`│ ${hCells} │`);
  lines.push(`│ ${sepLine} │`);

  // Data rows
  for (const row of table.rows.slice(0, 15)) {
    const cells = row.map((cell, i) => padCell(cell, widths[i] ?? 10, table.alignments[i] ?? "left")).join(" │ ");
    lines.push(`│ ${cells} │`);
  }

  return lines.join("\n");
}

// ── Enhanced inline renderer ──────────────────────────────────

export function renderEnhancedMarkdown(text: string): string {
  if (!text) return "";

  const lines = text.split(/\r?\n/);
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Tables
    if (line.includes("|") && i + 1 < lines.length) {
      const table = parseMarkdownTable(lines, i);
      if (table) {
        output.push(renderMarkdownTable(table));
        i += 2 + table.rows.length;
        continue;
      }
    }

    // Code fences
    if (/^\s*```/.test(line)) {
      const lang = line.replace(/```\s*(\w*)\s*$/, "$1");
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i] ?? "")) {
        codeLines.push(lines[i] ?? "");
        i++;
      }
      i++; // skip closing ```
      if (lang) output.push(chalk.dim(`[${lang}]`));
      output.push(chalk.cyan(codeLines.join("\n")));
      continue;
    }

    // Headings
    const hMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (hMatch) {
      const content = hMatch[2] ?? "";
      output.push(chalk.bold.cyanBright(`\n${content}`));
      i++;
      continue;
    }

    // Task lists
    const taskMatch = /^(\s*)- \[(x| )\] (.*)$/i.exec(line);
    if (taskMatch) {
      const checked = taskMatch[2]?.toLowerCase() === "x";
      const marker = checked ? chalk.green("☒") : chalk.dim("☐");
      output.push(`  ${marker} ${renderInline(taskMatch[3] ?? "")}`);
      i++;
      continue;
    }

    // Unordered lists
    const ulMatch = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (ulMatch) {
      output.push(`  ${chalk.yellow("•")} ${renderInline(ulMatch[2] ?? "")}`);
      i++;
      continue;
    }

    // Ordered lists
    const olMatch = /^(\s*)\d+\.\s+(.*)$/.exec(line);
    if (olMatch) {
      output.push(`  ${chalk.yellow("◦")} ${renderInline(olMatch[2] ?? "")}`);
      i++;
      continue;
    }

    // Blockquotes
    const bqMatch = /^>\s?(.*)$/.exec(line);
    if (bqMatch) {
      output.push(`  ${chalk.dim("│")} ${chalk.italic(renderInline(bqMatch[1] ?? ""))}`);
      i++;
      continue;
    }

    // Horizontal rules
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      output.push(chalk.dim("─".repeat(60)));
      i++;
      continue;
    }

    // Regular line
    if (line.trim()) {
      output.push(renderInline(line));
    } else {
      output.push("");
    }
    i++;
  }

  return output.join("\n");
}

// ── Inline helpers ─────────────────────────────────────────────

function renderInline(text: string): string {
  if (!text) return text;
  let result = text;
  result = result.replace(/`([^`]+)`/g, (_, inner) => chalk.cyan(inner as string));
  result = result.replace(/\*\*([^*]+)\*\*/g, (_, inner) => chalk.bold(inner as string));
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, inner) => chalk.italic(inner as string));
  result = result.replace(/_([^_\n]+)_/g, (_, inner) => chalk.italic(inner as string));
  result = result.replace(/~~([^~]+)~~/g, (_, inner) => chalk.strikethrough(inner as string));
  return result;
}

function padCell(text: string, width: number, align: "left" | "center" | "right"): string {
  const w = displayWidth(text);
  if (w >= width) return text.slice(0, width - 1) + "…";
  const pad = width - w;
  if (align === "right") return " ".repeat(pad) + text;
  if (align === "center") return " ".repeat(Math.floor(pad / 2)) + text + " ".repeat(Math.ceil(pad / 2));
  return text + " ".repeat(pad);
}

function displayWidth(text: string): number {
  let w = 0;
  for (const ch of text.replace(/\x1b\[[0-9;]*m/g, "")) {
    w += (ch.codePointAt(0) ?? 0) > 0x7f ? 2 : 1;
  }
  return w;
}
