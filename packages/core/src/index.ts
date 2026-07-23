// Core library public API — used by the CLI package (and future IDE companions).
//
// Mirrors the deepcode-core public-surface discipline: a single barrel that
// declares the public/private boundary so consumers import from the package
// root (`@YuanyuanMa03/cropcode-core`) instead of reaching into internal paths.

// Settings
export {
  resolveCurrentSettings,
  resolveSettings,
  resolveSettingsSources,
  readSettings,
  readProjectSettings,
  writeSettings,
  writeProjectSettings,
  writeModelConfigSelection,
  applyModelConfigSelection,
  modelConfigKey,
  getUserSettingsPath,
  getProjectSettingsPath,
  DEFAULT_MODEL,
  DEFAULT_BASE_URL,
} from "./settings";
export type {
  CropcodeSettings,
  ResolvedCropcodeSettings,
  CropcodeEnv,
  ModelConfigSelection,
  PermissionScope,
  PermissionSettings,
  PermissionDefaultMode,
  McpServerConfig,
  ReasoningEffort,
  EnabledSkillsSettings,
  HookEvent,
  HookConfig,
  HookMatcher,
  HooksSettings,
} from "./settings";

// Session
export { SessionManager, getProjectCode } from "./session";
export type {
  SessionMessage,
  SessionEntry,
  SessionStatus,
  SessionsIndex,
  SessionMessageRole,
  MessageMeta,
  UndoTarget,
  UserPromptContent,
  SkillInfo,
  ModelUsage,
  SessionProcessEntry,
  BashTimeoutAdjustment,
  LlmStreamProgress,
} from "./session";

// Prompt utilities
export {
  getSystemPrompt,
  getCompactPrompt,
  getRuntimeContext,
  getDefaultSkillPrompt,
  getTools,
  buildSkillDocumentsPrompt,
} from "./prompt";
export type { ToolDefinition, SkillPromptDocument } from "./prompt";

// Tools
export { ToolExecutor } from "./tools/executor";
export type {
  CreateOpenAIClient,
  ToolCall,
  ToolExecutionContext,
  ToolExecutionHooks,
  ToolExecutionResult,
  ToolHandler,
  ToolCallExecution,
  ProcessTimeoutInfo,
  ProcessTimeoutControl,
  BackgroundProcessCompletion,
  ToolExecutionFollowUpMessage,
} from "./common/tool-types";

// Tool handlers
export { handleBashTool, clearSessionWorkingDir } from "./tools/bash-handler";
export { handleReadTool } from "./tools/read-handler";
export { handleWriteTool } from "./tools/write-handler";
export { handleEditTool } from "./tools/edit-handler";
export { handleUpdatePlanTool } from "./tools/update-plan-handler";
export { handleWebSearchTool } from "./tools/web-search-handler";
export { handleAskUserQuestionTool } from "./tools/ask-user-question-handler";
export { handleGlobTool } from "./tools/glob-handler";
export { handleGrepTool } from "./tools/grep-handler";

// MCP
export { McpManager } from "./mcp/mcp-manager";
export { McpClient } from "./mcp/mcp-client";
export type { McpServerStatus } from "./mcp/mcp-manager";

// Multi-provider system (cropcode-specific)
export {
  BUILTIN_PROVIDERS,
  findProviderById,
  findModelInProvider,
  resolveProviderBaseURL,
} from "./common/provider-presets";
export type { ProviderPreset, ProviderModel } from "./common/provider-presets";
export {
  getActiveCredential,
  setActiveCredential,
  getActiveBaseURL,
  getActiveApiKey,
  getActiveModel,
  getActiveThinkingEnabled,
  getActiveReasoningEffort,
  hasCredentials,
  getActiveProviderLabel,
  getActiveModelLabel,
} from "./common/providers";
export type { ProviderCredential } from "./common/providers";

// Hooks engine (cropcode-specific, Claude-Code-style command hooks)
export { executeHooks, aggregateHookResults, getMatchingHooks } from "./hooks";
export type { HookInput, HookResult } from "./hooks";

// Marketplace (cropcode-specific, Claude-format plugin marketplace)
export {
  addMarketplace,
  removeMarketplace,
  listMarketplaces,
  getMarketplaceManifest,
  installPlugin,
  removePlugin,
  listInstalledPlugins,
} from "./marketplace";

// Common utilities
export { createOpenAIClient } from "./common/openai-client";
export { buildThinkingRequestOptions } from "./common/openai-thinking";
export { readTextFileWithMetadata, writeTextFile, buildDiffPreview, ensureParentDirectory } from "./common/file-utils";
export { normalizeFilePath, getSnippet, clearSessionState, recordFileState, getFileState } from "./common/state";
export { GitFileHistory } from "./common/file-history";
export { killProcessTree } from "./common/process-tree";
export { launchNotifyScript } from "./common/notify";
export { withRetry } from "./common/retry";
export {
  MICROCOMPACT_TRIGGER_THRESHOLD,
  MICROCOMPACT_KEEP_RECENT,
  MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES,
  getEffectiveContextWindow,
  getCompactPromptTokenThreshold,
  getMaxOutputTokens,
  supportsMultimodal,
} from "./common/model-capabilities";
export { findGitBashPath, resolveShellPath, setShellIfWindows } from "./common/shell-utils";
export { logApiError } from "./common/error-logger";
export { logOpenAIChatCompletionDebug } from "./common/debug-logger";
export { truncateWithTail, maybePersistToolResult, BASH_PERSIST_THRESHOLD } from "./common/tool-result-storage";
export {
  clampBashTimeoutMs,
  DEFAULT_BASH_TIMEOUT_MS,
  BASH_TIMEOUT_INCREMENT_MS,
  BASH_TIMEOUT_DECREMENT_MS,
} from "./common/bash-timeout";
export { executeValidatedTool, semanticBoolean } from "./common/runtime";
export { OpenAIMessageConverter } from "./common/openai-message-converter";
export {
  computeToolCallPermissions,
  buildPermissionToolExecution,
  hasUserPermissionReplies,
  appendProjectPermissionAllows,
  normalizeAskPermissions,
  parseToolCallForPermissions,
} from "./common/permissions";
export type {
  AskPermissionRequest,
  AskPermissionScope,
  BashPermissionScope,
  MessageToolPermission,
  PermissionDecision,
  PermissionToolCall,
  UserToolPermission,
} from "./common/permissions";

// State types
export type { FileState, FileSnippet, FileLineEnding } from "./common/state";
export type { FileReadMetadata } from "./common/file-utils";
