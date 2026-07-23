import { spawn } from "child_process";
import type { HookEvent, HookConfig, HooksSettings, HookInput, HookResult, HookExecutionResult } from "./types";

const DEFAULT_HOOK_TIMEOUT_MS = 30_000;

export function getMatchingHooks(
  event: HookEvent,
  toolName: string | undefined,
  settings: HooksSettings
): Array<{ hook: HookConfig; matcher?: string }> {
  const matchers = settings[event];
  if (!matchers || matchers.length === 0) {
    return [];
  }
  const result: Array<{ hook: HookConfig; matcher?: string }> = [];
  for (const entry of matchers) {
    if (!entry.hooks || entry.hooks.length === 0) {
      continue;
    }
    if (entry.matcher && toolName) {
      const patterns = entry.matcher.split("|").map((p) => p.trim());
      const matched = patterns.some((pattern) => {
        if (pattern.includes("*")) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          return regex.test(toolName);
        }
        return pattern === toolName;
      });
      if (!matched) {
        continue;
      }
    }
    for (const hook of entry.hooks) {
      result.push({ hook, matcher: entry.matcher });
    }
  }
  return result;
}

export async function executeHook(hook: HookConfig, input: HookInput, matcher?: string): Promise<HookExecutionResult> {
  const startTime = Date.now();
  const timeout = hook.timeout ?? DEFAULT_HOOK_TIMEOUT_MS;

  try {
    const { exitCode, stdout, stderr } = await runCommand(hook.command, input, timeout);
    const duration = Date.now() - startTime;

    let result: HookResult = {};
    if (stdout) {
      try {
        const parsed = JSON.parse(stdout);
        if (parsed && typeof parsed === "object") {
          result = parsed as HookResult;
        }
      } catch {
        // non-JSON stdout is treated as additional context
        if (exitCode === 0) {
          result = { additionalContext: stdout };
        }
      }
    }

    if (exitCode === 2) {
      result.blocked = true;
      result.blockReason = stderr || stdout || "Hook blocked execution";
    }

    return { hook, event: input.event, matcher, result, duration, exitCode, stdout, stderr };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      hook,
      event: input.event,
      matcher,
      result: {},
      duration,
      exitCode: -1,
      stdout: "",
      stderr: "",
      error: errorMsg,
    };
  }
}

export async function executeHooks(
  event: HookEvent,
  toolName: string | undefined,
  input: HookInput,
  settings: HooksSettings
): Promise<HookExecutionResult[]> {
  const matched = getMatchingHooks(event, toolName, settings);
  if (matched.length === 0) {
    return [];
  }
  const results = await Promise.all(matched.map(({ hook, matcher }) => executeHook(hook, input, matcher)));
  return results;
}

export function aggregateHookResults(results: HookExecutionResult[]): HookResult {
  const aggregated: HookResult = {};
  for (const { result } of results) {
    if (result.blocked) {
      aggregated.blocked = true;
      aggregated.blockReason = result.blockReason;
    }
    if (result.decision === "block") {
      aggregated.blocked = true;
      aggregated.blockReason = result.blockReason || "Hook blocked execution";
    }
    if (result.decision === "approve") {
      aggregated.decision = "approve";
    }
    if (result.permissionDecision) {
      aggregated.permissionDecision = result.permissionDecision;
    }
    if (result.additionalContext) {
      aggregated.additionalContext = aggregated.additionalContext
        ? `${aggregated.additionalContext}\n${result.additionalContext}`
        : result.additionalContext;
    }
    if (result.stopReason) {
      aggregated.stopReason = result.stopReason;
    }
    if (result.updatedInput) {
      aggregated.updatedInput = { ...(aggregated.updatedInput ?? {}), ...result.updatedInput };
    }
  }
  return aggregated;
}

function runCommand(
  command: string,
  input: HookInput,
  timeoutMs: number
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bash", ["-c", command], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: timeoutMs,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (error) => {
      reject(error);
    });

    proc.on("close", (code) => {
      resolve({ exitCode: code ?? -1, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    try {
      proc.stdin.write(JSON.stringify(input));
      proc.stdin.end();
    } catch {
      // stdin write failed, process will still complete
    }
  });
}
