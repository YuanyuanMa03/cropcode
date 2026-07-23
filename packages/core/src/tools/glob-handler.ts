import type { ToolExecutionResult, ToolExecutionContext } from "./executor";
import { execFile } from "child_process";
import path from "path";

export async function handleGlobTool(
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const pattern = typeof args.pattern === "string" ? args.pattern : "";
  if (!pattern.trim()) {
    return { ok: false, name: "glob", error: 'Missing required "pattern" string.' };
  }

  const searchPath = typeof args.path === "string" ? args.path : context.projectRoot;
  const absolutePath = path.isAbsolute(searchPath) ? searchPath : path.resolve(context.projectRoot, searchPath);

  // Use find command which is available on all platforms
  const findArgs = [absolutePath, "-type", "f", "-name", pattern];

  // Exclude common VCS and dependency directories
  const excludeDirs = [".git", ".svn", ".hg", "node_modules", ".cropcode", "__pycache__"];
  for (const dir of excludeDirs) {
    findArgs.push("-not", "-path", `*/${dir}/*`);
  }

  try {
    const stdout = await execFind(findArgs, 20000);
    if (!stdout.trim()) {
      return { ok: true, name: "glob", output: "No files matched the pattern." };
    }

    const lines = stdout
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        if (l.startsWith(context.projectRoot + path.sep)) {
          return l.slice(context.projectRoot.length + 1);
        }
        return l;
      });

    const headLimit = typeof args.head_limit === "number" ? args.head_limit : 250;
    let truncated = false;
    let result = lines;
    if (headLimit > 0 && lines.length > headLimit) {
      result = lines.slice(0, headLimit);
      truncated = true;
    }

    let output = result.join("\n");
    if (truncated) {
      output += `\n\n[Showing ${headLimit} of ${lines.length} results. Use offset to paginate.]`;
    }

    return { ok: true, name: "glob", output };
  } catch (err: unknown) {
    return { ok: false, name: "glob", error: `Search failed: ${(err as Error).message}` };
  }
}

function execFind(args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("find", args, { maxBuffer: 20 * 1024 * 1024, timeout: timeoutMs }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}
