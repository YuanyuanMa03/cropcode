import type OpenAI from "openai";
import { handleAskUserQuestionTool } from "./ask-user-question-handler";
import { handleBashTool } from "./bash-handler";
import { handleEditTool } from "./edit-handler";
import { handleGlobTool } from "./glob-handler";
import { handleGrepTool } from "./grep-handler";
import { handleReadTool } from "./read-handler";
import { handleUpdatePlanTool } from "./update-plan-handler";
import { handleWebSearchTool } from "./web-search-handler";
import { handleWriteTool } from "./write-handler";
import type { McpManager } from "../mcp/mcp-manager";
import type { HooksSettings } from "../settings";
import { executeHooks, aggregateHookResults, type HookInput } from "../hooks";

export type CreateOpenAIClient = () => {
  client: OpenAI | null;
  model: string;
  baseURL?: string;
  temperature?: number;
  thinkingEnabled: boolean;
  reasoningEffort?: string;
  debugLogEnabled?: boolean;
  notify?: string;
  webSearchTool?: string;
  env?: Record<string, string>;
  machineId?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type BackgroundProcessCompletion = {
  taskId: string;
  processId: number;
  command: string;
  outputPath: string;
  ok: boolean;
  exitCode: number | null;
  signal: string | null;
  error?: string;
  cwd: string | null;
  shellPath: string;
  startedAtMs: number;
  completedAtMs: number;
};

export type ToolExecutionContext = {
  sessionId: string;
  projectRoot: string;
  toolCall: ToolCall;
  createOpenAIClient?: CreateOpenAIClient;
  onProcessStart?: (processId: string | number, command: string) => void;
  onProcessExit?: (processId: string | number) => void;
  onProcessStdout?: (processId: string | number, chunk: string) => void;
  onProcessTimeoutControl?: (processId: string | number, control: ProcessTimeoutControl | null) => void;
  onBackgroundProcessComplete?: (completion: BackgroundProcessCompletion) => void;
  onBeforeFileMutation?: (filePath: string) => void;
  onAfterFileMutation?: (filePath: string) => void;
  bashTimeoutMs?: number;
  bashMinTimeoutMs?: number;
};

export type ToolExecutionHooks = {
  onProcessStart?: (processId: string | number, command: string) => void;
  onProcessExit?: (processId: string | number) => void;
  onProcessStdout?: (processId: string | number, chunk: string) => void;
  onProcessTimeoutControl?: (processId: string | number, control: ProcessTimeoutControl | null) => void;
  onBackgroundProcessComplete?: (completion: BackgroundProcessCompletion) => void;
  onBeforeFileMutation?: (filePath: string) => void;
  onAfterFileMutation?: (filePath: string) => void;
  shouldStop?: () => boolean;
};

export type ProcessTimeoutInfo = {
  timeoutMs: number;
  startedAtMs: number;
  deadlineAtMs: number;
  timedOut: boolean;
};

export type ProcessTimeoutControl = {
  getInfo: () => ProcessTimeoutInfo;
  setTimeoutMs: (timeoutMs: number) => ProcessTimeoutInfo;
};

export type ToolExecutionResult = {
  ok: boolean;
  name: string;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  awaitUserResponse?: boolean;
  followUpMessages?: ToolExecutionFollowUpMessage[];
};

export type ToolExecutionFollowUpMessage = {
  role: "system";
  content: string;
  contentParams?: unknown | null;
};

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

const BUILT_IN_TOOL_NAME_ALIASES = new Map<string, string>([
  ["Bash", "bash"],
  ["Read", "read"],
  ["Write", "write"],
  ["Edit", "edit"],
]);

export type ToolCallExecution = {
  toolCallId: string;
  content: string;
  result: ToolExecutionResult;
};

export class ToolExecutor {
  private readonly projectRoot: string;
  private readonly createOpenAIClient?: CreateOpenAIClient;
  private readonly mcpManager?: McpManager;
  private readonly toolHandlers = new Map<string, ToolHandler>();
  private readonly hooksSettings?: HooksSettings;
  private readonly sessionId: string;

  constructor(
    projectRoot: string,
    createOpenAIClient?: CreateOpenAIClient,
    mcpManager?: McpManager,
    hooksSettings?: HooksSettings,
    sessionId?: string
  ) {
    this.projectRoot = projectRoot;
    this.createOpenAIClient = createOpenAIClient;
    this.mcpManager = mcpManager;
    this.hooksSettings = hooksSettings;
    this.sessionId = sessionId ?? "";
    this.registerToolHandlers();
  }

  // Tools that are safe to run in parallel (read-only, no side effects)
  private static readonly CONCURRENCY_SAFE_TOOLS = new Set(["read", "Read", "WebSearch", "grep", "glob"]);

  async executeToolCalls(
    sessionId: string,
    toolCalls: unknown[],
    hooks?: ToolExecutionHooks
  ): Promise<ToolCallExecution[]> {
    const parsedCalls = toolCalls
      .map((toolCall) => this.parseToolCall(toolCall))
      .filter((toolCall): toolCall is ToolCall => Boolean(toolCall));

    // Partition into concurrent-safe batches and serial batches
    const batches: ToolCall[][] = [];
    let currentBatch: ToolCall[] = [];
    for (const toolCall of parsedCalls) {
      if (ToolExecutor.CONCURRENCY_SAFE_TOOLS.has(toolCall.function.name)) {
        currentBatch.push(toolCall);
      } else {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
        }
        batches.push([toolCall]);
      }
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    const executions: ToolCallExecution[] = [];
    for (const batch of batches) {
      if (hooks?.shouldStop?.()) break;
      if (batch.length === 1) {
        const result = await this.executeToolCall(sessionId, batch[0], hooks);
        executions.push({
          toolCallId: batch[0].id,
          content: this.formatToolResult(result),
          result,
        });
      } else {
        // Run concurrent-safe tools in parallel
        const results = await Promise.allSettled(
          batch.map((toolCall) => this.executeToolCall(sessionId, toolCall, hooks))
        );
        for (let i = 0; i < batch.length; i++) {
          const settled = results[i];
          const result =
            settled.status === "fulfilled"
              ? settled.value
              : { ok: false, name: batch[i].function.name, error: settled.reason?.message ?? "Unknown error" };
          executions.push({
            toolCallId: batch[i].id,
            content: this.formatToolResult(result),
            result,
          });
        }
      }
      if (hooks?.shouldStop?.()) break;
    }
    return executions;
  }

  private registerToolHandlers(): void {
    this.toolHandlers.set("bash", handleBashTool);
    this.toolHandlers.set("read", handleReadTool);
    this.toolHandlers.set("write", handleWriteTool);
    this.toolHandlers.set("edit", handleEditTool);
    this.toolHandlers.set("AskUserQuestion", handleAskUserQuestionTool);
    this.toolHandlers.set("UpdatePlan", handleUpdatePlanTool);
    this.toolHandlers.set("WebSearch", handleWebSearchTool);
    this.toolHandlers.set("grep", handleGrepTool);
    this.toolHandlers.set("glob", handleGlobTool);
  }

  private parseToolCall(toolCall: unknown): ToolCall | null {
    if (!toolCall || typeof toolCall !== "object") {
      return null;
    }

    const record = toolCall as {
      id?: unknown;
      type?: unknown;
      function?: { name?: unknown; arguments?: unknown };
    };

    if (typeof record.id !== "string") {
      return null;
    }

    const functionRecord = record.function;
    if (!functionRecord || typeof functionRecord !== "object") {
      return null;
    }

    if (typeof functionRecord.name !== "string") {
      return null;
    }

    const rawArguments = typeof functionRecord.arguments === "string" ? functionRecord.arguments : "";

    return {
      id: record.id,
      type: "function",
      function: {
        name: functionRecord.name,
        arguments: rawArguments,
      },
    };
  }

  private async executeToolCall(
    sessionId: string,
    toolCall: ToolCall,
    hooks?: ToolExecutionHooks
  ): Promise<ToolExecutionResult> {
    const toolName = toolCall.function.name;
    const handlerName = BUILT_IN_TOOL_NAME_ALIASES.get(toolName) ?? toolName;
    const handler = this.toolHandlers.get(handlerName);
    if (!handler) {
      // Try MCP tools
      if (this.mcpManager?.isMcpTool(toolName)) {
        const parsedArgs = this.parseToolArguments(toolCall.function.arguments);
        const args = parsedArgs.ok ? parsedArgs.args : {};
        return this.mcpManager.executeMcpTool(toolName, args);
      }
      return {
        ok: false,
        name: toolName,
        error: `Unknown tool: ${toolName}`,
      };
    }

    const parsedArgs = this.parseToolArguments(toolCall.function.arguments);
    if (!parsedArgs.ok) {
      return {
        ok: false,
        name: toolName,
        error: parsedArgs.error,
      };
    }

    // PreToolUse hooks
    if (this.hooksSettings) {
      const hookInput: HookInput = {
        event: "PreToolUse",
        sessionId: sessionId || this.sessionId,
        projectRoot: this.projectRoot,
        toolName,
        toolInput: parsedArgs.args,
      };
      const preResults = await executeHooks("PreToolUse", toolName, hookInput, this.hooksSettings);
      const preAggregated = aggregateHookResults(preResults);
      if (preAggregated.blocked) {
        return {
          ok: false,
          name: toolName,
          error: preAggregated.blockReason || "Hook blocked tool execution",
        };
      }
    }

    try {
      const result = await handler(parsedArgs.args, {
        sessionId,
        projectRoot: this.projectRoot,
        toolCall,
        createOpenAIClient: this.createOpenAIClient,
        onProcessStart: hooks?.onProcessStart,
        onProcessExit: hooks?.onProcessExit,
        onProcessStdout: hooks?.onProcessStdout,
        onProcessTimeoutControl: hooks?.onProcessTimeoutControl,
        onBackgroundProcessComplete: hooks?.onBackgroundProcessComplete,
        onBeforeFileMutation: hooks?.onBeforeFileMutation,
        onAfterFileMutation: hooks?.onAfterFileMutation,
      });

      // PostToolUse hooks
      if (this.hooksSettings) {
        const hookInput: HookInput = {
          event: result.ok ? "PostToolUse" : "PostToolUseFailure",
          sessionId: sessionId || this.sessionId,
          projectRoot: this.projectRoot,
          toolName,
          toolInput: parsedArgs.args,
          toolOutput: result.output,
          error: result.error,
        };
        await executeHooks(result.ok ? "PostToolUse" : "PostToolUseFailure", toolName, hookInput, this.hooksSettings);
      }

      return this.addTrustChainState(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.addTrustChainState({
        ok: false,
        name: toolName,
        error: message,
      });
    }
  }

  private addTrustChainState(result: ToolExecutionResult): ToolExecutionResult {
    const metadata = { ...(result.metadata ?? {}) };
    if (!result.ok) {
      metadata.tc = "TC_UNCERTAIN";
    } else if (result.error) {
      metadata.tc = "TC_CARRY";
    } else {
      metadata.tc = "TC_NONE";
    }
    return { ...result, metadata };
  }

  private parseToolArguments(
    rawArguments: string
  ): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
    if (!rawArguments) {
      return { ok: true, args: {} };
    }

    try {
      const parsed = JSON.parse(rawArguments);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "InputParseError: Tool arguments must be a JSON object." };
      }
      return { ok: true, args: parsed as Record<string, unknown> };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error:
          `InputParseError: Failed to parse tool arguments: ${message}. ` +
          "Ensure the tool call arguments are valid JSON. Prefer Edit over Write for large existing-file changes.",
      };
    }
  }

  private formatToolResult(result: ToolExecutionResult): string {
    const payload: Record<string, unknown> = {
      ok: result.ok,
      name: result.name,
    };

    if (typeof result.output !== "undefined") {
      payload.output = result.output;
    }

    if (result.error) {
      payload.error = result.error;
    }

    if (result.metadata && Object.keys(result.metadata).length > 0) {
      payload.metadata = result.metadata;
    }

    if (result.awaitUserResponse === true) {
      payload.awaitUserResponse = true;
    }

    return JSON.stringify(payload, null, 2);
  }
}
