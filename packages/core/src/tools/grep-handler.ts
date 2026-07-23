import type { ToolExecutionResult, ToolExecutionContext } from "./executor";
import { execFile } from "child_process";
import path from "path";

export async function handleGrepTool(
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const pattern = typeof args.pattern === "string" ? args.pattern : "";
  if (!pattern.trim()) {
    return { ok: false, name: "grep", error: 'Missing required "pattern" string.' };
  }

  const searchPath = typeof args.path === "string" ? args.path : context.projectRoot;
  const absolutePath = path.isAbsolute(searchPath) ? searchPath : path.resolve(context.projectRoot, searchPath);

  const glob = typeof args.glob === "string" ? args.glob : undefined;
  const outputMode = typeof args.output_mode === "string" ? args.output_mode : "files_with_matches";
  const caseInsensitive = args.i === true;
  const contextLines = typeof args.context === "number" ? args.context : undefined;
  const beforeLines = typeof args.B === "number" ? args.B : undefined;
  const afterLines = typeof args.A === "number" ? args.A : undefined;
  const headLimit = typeof args.head_limit === "number" ? args.head_limit : 250;
  const offset = typeof args.offset === "number" ? args.offset : 0;
  const type = typeof args.type === "string" ? args.type : undefined;

  const rgArgs: string[] = ["--hidden", "--glob", "!.git", "--glob", "!.svn", "--glob", "!.hg", "--max-columns", "500"];

  if (caseInsensitive) rgArgs.push("-i");

  if (outputMode === "files_with_matches") {
    rgArgs.push("-l");
  } else if (outputMode === "count") {
    rgArgs.push("-c");
  }

  if (outputMode === "content") {
    rgArgs.push("-n");
    if (typeof contextLines === "number") {
      rgArgs.push("-C", String(contextLines));
    } else {
      if (typeof beforeLines === "number") rgArgs.push("-B", String(beforeLines));
      if (typeof afterLines === "number") rgArgs.push("-A", String(afterLines));
    }
  }

  if (pattern.startsWith("-")) {
    rgArgs.push("-e", pattern);
  } else {
    rgArgs.push(pattern);
  }

  if (type) rgArgs.push("--type", type);
  if (glob) rgArgs.push("--glob", glob);

  rgArgs.push(absolutePath);

  try {
    const stdout = await execRg(rgArgs, 20000);
    if (!stdout.trim()) {
      return { ok: true, name: "grep", output: "No matches found." };
    }

    let lines = stdout.split("\n").filter((l) => l.trim());

    if (outputMode === "files_with_matches") {
      lines = lines.map((l) => relativizePath(l, context.projectRoot));
    } else if (outputMode === "content") {
      lines = lines.map((l) => relativizeContentLine(l, context.projectRoot));
    }

    const totalLines = lines.length;
    let truncated = false;

    if (headLimit > 0) {
      const sliced = lines.slice(offset, offset + headLimit);
      if (sliced.length < totalLines - offset) truncated = true;
      lines = sliced;
    } else if (offset > 0) {
      lines = lines.slice(offset);
    }

    let output = lines.join("\n");
    if (truncated) {
      output += `\n\n[Showing results with pagination = limit: ${headLimit}, offset: ${offset}]`;
    }

    return { ok: true, name: "grep", output };
  } catch (err: unknown) {
    const exitCode = (err as { code?: number })?.code;
    if (exitCode === 1) {
      return { ok: true, name: "grep", output: "No matches found." };
    }
    if (exitCode === 2) {
      return { ok: false, name: "grep", error: `ripgrep error: ${(err as Error).message}` };
    }
    return { ok: false, name: "grep", error: `Search failed: ${(err as Error).message}` };
  }
}

function execRg(args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("rg", args, { maxBuffer: 20 * 1024 * 1024, timeout: timeoutMs }, (error, stdout) => {
      if (error) {
        const errCode = (error as NodeJS.ErrnoException).code;
        if (errCode === "1") {
          resolve(stdout);
          return;
        }
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

function relativizePath(absPath: string, projectRoot: string): string {
  if (absPath.startsWith(projectRoot + path.sep)) {
    return absPath.slice(projectRoot.length + 1);
  }
  return absPath;
}

function relativizeContentLine(line: string, projectRoot: string): string {
  const sep = projectRoot + path.sep;
  if (line.startsWith(sep)) {
    return line.slice(projectRoot.length + 1);
  }
  return line;
}
