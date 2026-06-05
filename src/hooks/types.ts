export type HookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "SessionStart"
  | "SessionEnd"
  | "Stop"
  | "UserPromptSubmit"
  | "PreCompact"
  | "PostCompact";

export type HookType = "command";

export type HookConfig = {
  type: HookType;
  command: string;
  timeout?: number;
};

export type HookMatcher = {
  matcher?: string;
  hooks: HookConfig[];
};

export type HooksSettings = Partial<Record<HookEvent, HookMatcher[]>>;

export type HookInput = {
  event: HookEvent;
  sessionId: string;
  projectRoot: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  error?: string;
  [key: string]: unknown;
};

export type HookResult = {
  decision?: "approve" | "block";
  permissionDecision?: "allow" | "deny" | "ask";
  additionalContext?: string;
  stopReason?: string;
  updatedInput?: Record<string, unknown>;
  blocked?: boolean;
  blockReason?: string;
};

export type HookExecutionResult = {
  hook: HookConfig;
  event: HookEvent;
  matcher?: string;
  result: HookResult;
  duration: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
};
