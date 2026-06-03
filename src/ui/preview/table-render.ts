/**
 * Data table → formatted terminal display.
 *
 * Auto-detects CSV/TSV/JSON data and renders as aligned ASCII tables.
 */

import * as fs from "fs";

export type TableData = {
  headers: string[];
  rows: string[][];
};

// ── Parser ────────────────────────────────────────────────────

export function parseCSV(content: string, delimiter = ","): TableData {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

export function detectDelimiter(firstLine: string): "," | "\t" {
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs >= commas ? "\t" : ",";
}

export function parseFile(filePath: string): TableData | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const firstLine = content.split(/\r?\n/)[0] ?? "";
    const delim = detectDelimiter(firstLine);
    return parseCSV(content, delim);
  } catch {
    return null;
  }
}

// ── Renderer ──────────────────────────────────────────────────

export function renderTable(data: TableData, opts: { maxCols?: number; maxWidth?: number } = {}): string {
  const { headers, rows } = data;
  if (headers.length === 0) return "";

  const maxCols = opts.maxCols ?? 8;
  const maxWidth = opts.maxWidth ?? 120;
  const cols = headers.slice(0, maxCols);
  const colCount = cols.length;

  // Calculate column widths
  const widths: number[] = cols.map((h, i) => {
    let max = displayWidth(h);
    for (const row of rows) {
      const val = row[i] ?? "";
      max = Math.max(max, displayWidth(val));
    }
    return Math.min(max, Math.floor(maxWidth / colCount) - 3);
  });

  const totalWidth = widths.reduce((s, w) => s + w + 3, 1); // +3 for "│ " separator, +1 for right border

  if (totalWidth > maxWidth) {
    // Scale down proportionally
    const scale = (maxWidth - 1 - colCount * 3) / (totalWidth - 1 - colCount * 3);
    for (let i = 0; i < widths.length; i++) {
      widths[i] = Math.max(4, Math.floor(widths[i] * scale));
    }
  }

  const separator = "─".repeat(widths.reduce((s, w) => s + w + 3, 1));

  const lines: string[] = [];

  // Top border
  lines.push(`┌${separator}┐`);

  // Header
  const headerCells = cols.map((h, i) => padCell(h, widths[i])).join(" │ ");
  lines.push(`│ ${headerCells} │`);

  // Separator
  const sepCells = widths.map((w) => "─".repeat(w)).join("─┼─");
  lines.push(`│ ${sepCells} │`);

  // Rows
  const displayRows = rows.slice(0, 20); // Limit to 20 rows
  for (const row of displayRows) {
    const cells = cols.map((_, i) => padCell(row[i] ?? "", widths[i])).join(" │ ");
    lines.push(`│ ${cells} │`);
  }

  // Bottom border
  lines.push(`└${separator}┘`);

  if (rows.length > 20) {
    lines.push(`  ... and ${rows.length - 20} more rows`);
  }

  return lines.join("\n");
}

function padCell(text: string, width: number): string {
  const w = displayWidth(text);
  if (w >= width) return text.slice(0, width - 1) + "…";
  return text + " ".repeat(width - w);
}

function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    width += code > 0x7f ? 2 : 1; // CJK characters = 2 columns
  }
  return width;
}

export function isTableFile(filePath: string): boolean {
  const ext = filePath.toLowerCase();
  return ext.endsWith(".csv") || ext.endsWith(".tsv") || ext.endsWith(".tab");
}
