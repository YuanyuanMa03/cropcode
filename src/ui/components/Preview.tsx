/**
 * Preview component — renders images, tables, LaTeX, and markdown inline in the terminal.
 *
 * Usage in Ink components:
 *   <Preview filePath="/tmp/plot.png" />
 *   <Preview content="# Hello\n\n| a | b |\n|---|---|\n| 1 | 2 |" type="markdown" />
 */

import React, { useMemo } from "react";
import { Text, Box } from "ink";
import { previewFile, renderLatex, renderEnhancedMarkdown, renderMarkdownWithMath } from "../preview";

type PreviewProps = {
  /** File path to preview */
  filePath?: string;
  /** Inline content to render */
  content?: string;
  /** Content type hint */
  type?: "image" | "table" | "latex" | "markdown" | "auto";
  /** Maximum width for tables */
};

export function Preview({ filePath, content, type = "auto" }: PreviewProps): React.ReactElement | null {
  const result = useMemo(() => {
    if (filePath) {
      return previewFile(filePath);
    }
    if (content) {
      if (type === "latex") {
        const r = renderLatex(content);
        return { type: "latex" as const, ansi: r.text, imagePath: r.imagePath ?? null, filePath: "" };
      }
      if (type === "markdown" || type === "auto") {
        return {
          type: "markdown" as const,
          ansi: renderMarkdownWithMath(content),
          imagePath: null,
          filePath: "",
        };
      }
      return { type: "text" as const, ansi: content, imagePath: null, filePath: "" };
    }
    return null;
  }, [filePath, content, type]);

  if (!result) return null;

  return (
    <Box flexDirection="column" marginY={1} paddingLeft={1} borderStyle="round" borderColor="cyan">
      {result.type === "image" && result.ansi ? (
        <>
          <Text dimColor>[Image Preview]</Text>
          <Text>{result.ansi}</Text>
          <Text dimColor>{result.filePath}</Text>
        </>
      ) : result.type === "image" ? (
        <Text dimColor>[Image] Open: {result.filePath}</Text>
      ) : result.type === "table" ? (
        <>
          <Text bold color="cyanBright">
            [Data Preview]
          </Text>
          <Text>{result.ansi}</Text>
        </>
      ) : (
        <Text>{result.ansi}</Text>
      )}
    </Box>
  );
}

/**
 * A simpler component that just renders the ANSI output
 * without Ink borders — useful for inline display.
 */
export function PreviewRaw({ filePath, content, type = "auto" }: Omit<PreviewProps, "maxWidth">): string | null {
  if (filePath) {
    const result = previewFile(filePath);
    return result.ansi;
  }
  if (content && (type === "latex" || type === "auto")) {
    return renderEnhancedMarkdown(content);
  }
  return content ?? null;
}
