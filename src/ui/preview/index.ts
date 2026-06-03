/**
 * Unified Preview API for terminal rendering.
 *
 * Auto-detects file types and renders them in the terminal:
 * - PNG/JPEG/GIF → inline image (iTerm2/Kitty)
 * - CSV/TSV → formatted ASCII table
 * - LaTeX → Unicode math (or PNG via pdflatex)
 * - JSON → syntax-highlighted tree (planned)
 */

export { renderImage, tempPlotPath } from "./terminal-image";
export { renderLatex, latexToUnicode, renderLatexToPng, isLatexAvailable } from "./latex-render";
export { renderTable, parseFile as parseTableFile } from "./table-render";
export { renderEnhancedMarkdown } from "./enhanced-markdown";

import { renderImage } from "./terminal-image";
import { renderLatex, latexToUnicode } from "./latex-render";
import { renderEnhancedMarkdown } from "./enhanced-markdown";
import { renderTable, parseFile } from "./table-render";
import * as fs from "fs";
import * as path from "path";

// ── File type detection ────────────────────────────────────────

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".tif"]);
const TABLE_EXTS = new Set([".csv", ".tsv", ".tab"]);
const LATEX_EXTS = new Set([".tex", ".latex"]);
const MARKDOWN_EXTS = new Set([".md", ".markdown", ".mdx"]);

export type PreviewResult = {
  type: "image" | "table" | "latex" | "markdown" | "text" | "none";
  /** Formatted ANSI string for terminal display */
  ansi: string | null;
  /** Path to generated image (for LaTeX PNG renders), null if N/A */
  imagePath: string | null;
  /** File path for external open fallback */
  filePath: string;
};

export function previewFile(filePath: string): PreviewResult {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return { type: "none", ansi: null, imagePath: null, filePath: abs };

  const ext = path.extname(abs).toLowerCase();
  const stat = fs.statSync(abs);

  // Images
  if (IMAGE_EXTS.has(ext)) {
    const img = renderImage(abs, { width: "80%" });
    return {
      type: "image",
      ansi: img.ansi,
      imagePath: img.filePath,
      filePath: abs,
    };
  }

  // Data tables
  if (TABLE_EXTS.has(ext)) {
    const data = parseFile(abs);
    if (data) {
      return {
        type: "table",
        ansi: renderTable(data),
        imagePath: null,
        filePath: abs,
      };
    }
  }

  // Markdown
  if (MARKDOWN_EXTS.has(ext) && stat.size < 1024 * 500) {
    const content = fs.readFileSync(abs, "utf8");
    return {
      type: "markdown",
      ansi: renderEnhancedMarkdown(content),
      imagePath: null,
      filePath: abs,
    };
  }

  // LaTeX
  if (LATEX_EXTS.has(ext) && stat.size < 1024 * 100) {
    const content = fs.readFileSync(abs, "utf8");
    const result = renderLatex(content);
    return {
      type: "latex",
      ansi: result.text,
      imagePath: result.imagePath ?? null,
      filePath: abs,
    };
  }

  return { type: "text", ansi: null, imagePath: null, filePath: abs };
}

/**
 * Inline LaTeX math detection in markdown text.
 * Extracts $...$ and $$...$$ blocks, renders to Unicode.
 */
export function renderMarkdownWithMath(text: string): string {
  // Replace display math $$...$$
  let result = text.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
    const rendered = latexToUnicode(math as string);
    return `\n  ${rendered}\n`;
  });

  // Replace inline math $...$
  result = result.replace(/\$([^$]+)\$/g, (_, math) => latexToUnicode(math as string));

  // Render the remaining markdown
  return renderEnhancedMarkdown(result);
}
