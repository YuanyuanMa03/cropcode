import * as fs from "fs";
import { z } from "zod";
import * as os from "os";
import * as path from "path";
import { defaultsToThinkingMode } from "./common/model-capabilities";

// Derive defaults from the first provider preset instead of hardcoding a specific vendor
import { BUILTIN_PROVIDERS } from "./common/provider-presets";
const FIRST_PROVIDER = BUILTIN_PROVIDERS[0];
const DEFAULT_MODEL = FIRST_PROVIDER?.models[0]?.id ?? "deepseek-v4-pro";
const DEFAULT_BASE_URL = FIRST_PROVIDER?.baseURL ?? "https://api.deepseek.com";

export type CropcodeEnv = Record<string, string | undefined> & {
  MODEL?: string;
  BASE_URL?: string;
  API_KEY?: string;
  THINKING_ENABLED?: string;
  REASONING_EFFORT?: string;
  TEMPERATURE?: string;
  DEBUG_LOG_ENABLED?: string;
};

export type ReasoningEffort = "low" | "medium" | "high" | "max";

export type McpServerConfig = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export type EnabledSkillsSettings = Record<string, boolean>;

export type CropcodeSettings = {
  env?: CropcodeEnv;
  model?: string;
  temperature?: number;
  thinkingEnabled?: boolean;
  reasoningEffort?: ReasoningEffort;
  debugLogEnabled?: boolean;
  notify?: string;
  webSearchTool?: string;
  mcpServers?: Record<string, McpServerConfig>;
  disabledSkills?: string[];
  enabledSkills?: EnabledSkillsSettings;
  permissions?: PermissionSettings;
};

export type ResolvedCropcodeSettings = {
  env: Record<string, string>;
  apiKey?: string;
  baseURL: string;
  model: string;
  temperature?: number;
  thinkingEnabled: boolean;
  reasoningEffort: ReasoningEffort;
  debugLogEnabled: boolean;
  notify?: string;
  webSearchTool?: string;
  mcpServers?: Record<string, McpServerConfig>;
  disabledSkills?: string[];
  enabledSkills: EnabledSkillsSettings;
  permissions: Required<PermissionSettings>;
  hooks?: HooksSettings;
};

export type ModelConfigSelection = {
  model: string;
  thinkingEnabled: boolean;
  reasoningEffort: ReasoningEffort;
};

export type PermissionScope =
  | "read-in-cwd"
  | "read-out-cwd"
  | "write-in-cwd"
  | "write-out-cwd"
  | "delete-in-cwd"
  | "delete-out-cwd"
  | "query-git-log"
  | "mutate-git-log"
  | "network"
  | "mcp";

export type PermissionDefaultMode = "allowAll" | "askAll" | "plan" | "acceptEdits" | "bypassPermissions";

export type PermissionSettings = {
  allow?: PermissionScope[];
  deny?: PermissionScope[];
  ask?: PermissionScope[];
  defaultMode?: PermissionDefaultMode;
};

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

export type HookConfig = {
  type: "command";
  command: string;
  timeout?: number;
};

export type HookMatcher = {
  matcher?: string;
  hooks: HookConfig[];
};

export type HooksSettings = Partial<Record<HookEvent, HookMatcher[]>>;

const mcpServerConfigSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

const permissionSettingsSchema = z.object({
  allow: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
  ask: z.array(z.string()).optional(),
  defaultMode: z.enum(["allowAll", "askAll", "plan", "acceptEdits", "bypassPermissions"]).optional(),
});

const cropcodeSettingsSchema = z
  .object({
    env: z.record(z.string(), z.string().optional()).optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    thinkingEnabled: z.boolean().optional(),
    reasoningEffort: z.enum(["low", "medium", "high", "max"]).optional(),
    debugLogEnabled: z.boolean().optional(),
    notify: z.string().optional(),
    webSearchTool: z.string().optional(),
    mcpServers: z.record(z.string(), mcpServerConfigSchema).optional(),
    disabledSkills: z.array(z.string()).optional(),
    enabledSkills: z.record(z.string(), z.boolean()).optional(),
    permissions: permissionSettingsSchema.optional(),
  })
  .strict();

export type SettingsProcessEnv = Record<string, string | undefined>;

function resolveReasoningEffort(value: unknown): ReasoningEffort | undefined {
  return value === "low" || value === "medium" || value === "high" || value === "max" ? value : undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "enabled", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "disabled", "no", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parseTemperature(value: unknown): number | undefined {
  const raw = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(raw) || raw < 0 || raw > 2) {
    return undefined;
  }
  return raw;
}

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEnv(env: CropcodeSettings["env"]): Record<string, string> {
  const result: Record<string, string> = {};
  if (!env) {
    return result;
  }

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

export function collectCropcodeEnv(processEnv: SettingsProcessEnv = process.env): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(processEnv)) {
    if (!key.startsWith("CROPCODE_") || typeof value !== "string") {
      continue;
    }
    const strippedKey = key.slice("CROPCODE_".length);
    if (strippedKey) {
      result[strippedKey] = value;
    }
  }
  return result;
}

function extractMcpEnv(env: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("MCP_")) {
      continue;
    }
    const strippedKey = key.slice("MCP_".length);
    if (strippedKey) {
      result[strippedKey] = value;
    }
  }
  return result;
}

function mergeMcpServers(
  userSettings: CropcodeSettings | null | undefined,
  projectSettings: CropcodeSettings | null | undefined,
  userEnv: Record<string, string>,
  projectEnv: Record<string, string>,
  systemEnv: Record<string, string>
): Record<string, McpServerConfig> | undefined {
  const userServers = userSettings?.mcpServers ?? {};
  const projectServers = projectSettings?.mcpServers ?? {};
  const serverNames = new Set([...Object.keys(userServers), ...Object.keys(projectServers)]);
  if (serverNames.size === 0) {
    return undefined;
  }

  const userMcpEnv = extractMcpEnv(userEnv);
  const projectMcpEnv = extractMcpEnv(projectEnv);
  const systemMcpEnv = extractMcpEnv(systemEnv);
  const merged: Record<string, McpServerConfig> = {};

  for (const name of serverNames) {
    const userConfig = userServers[name];
    const projectConfig = projectServers[name];
    const command = projectConfig?.command ?? userConfig?.command;
    if (!command) {
      continue;
    }

    const env = {
      ...userEnv,
      ...(userConfig?.env ?? {}),
      ...userMcpEnv,
      ...projectEnv,
      ...(projectConfig?.env ?? {}),
      ...projectMcpEnv,
      ...systemEnv,
      ...systemMcpEnv,
    };
    const config: McpServerConfig = {
      command,
      args: projectConfig?.args ?? userConfig?.args,
    };
    if (Object.keys(env).length > 0) {
      config.env = env;
    }
    merged[name] = config;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeDisabledSkills(
  userSettings: CropcodeSettings | null | undefined,
  projectSettings: CropcodeSettings | null | undefined
): string[] | undefined {
  const userSkills = userSettings?.disabledSkills ?? [];
  const projectSkills = projectSettings?.disabledSkills ?? [];
  const merged = [...new Set([...userSkills, ...projectSkills])].filter(Boolean);
  return merged.length > 0 ? merged : undefined;
}

function normalizeEnabledSkills(value: unknown): EnabledSkillsSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: EnabledSkillsSettings = {};
  for (const [name, enabled] of Object.entries(value)) {
    if (!name || typeof enabled !== "boolean") {
      continue;
    }
    result[name] = enabled;
  }
  return result;
}

function mergeEnabledSkills(
  userSettings: CropcodeSettings | null | undefined,
  projectSettings: CropcodeSettings | null | undefined
): EnabledSkillsSettings {
  return {
    ...normalizeEnabledSkills(userSettings?.enabledSkills),
    ...normalizeEnabledSkills(projectSettings?.enabledSkills),
  };
}

export function normalizePermissionList(scopes: PermissionScope[] | undefined): PermissionScope[] {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [];
  }
  const seen = new Set<PermissionScope>();
  const result: PermissionScope[] = [];
  for (const scope of scopes) {
    if (!seen.has(scope)) {
      seen.add(scope);
      result.push(scope);
    }
  }
  return result;
}

export function normalizePermissionDefaultMode(value: unknown): PermissionDefaultMode {
  if (
    value === "allowAll" ||
    value === "askAll" ||
    value === "plan" ||
    value === "acceptEdits" ||
    value === "bypassPermissions"
  ) {
    return value;
  }
  return "allowAll";
}

export function normalizePermissions(permissions: PermissionSettings | undefined): Required<PermissionSettings> {
  return {
    allow: normalizePermissionList(permissions?.allow),
    deny: normalizePermissionList(permissions?.deny),
    ask: normalizePermissionList(permissions?.ask),
    defaultMode: normalizePermissionDefaultMode(permissions?.defaultMode),
  };
}

export function mergePermissionLists(user: PermissionScope[], project: PermissionScope[]): PermissionScope[] {
  return normalizePermissionList([...user, ...project]);
}

export function mergePermissions(
  userSettings: CropcodeSettings | null | undefined,
  projectSettings: CropcodeSettings | null | undefined
): Required<PermissionSettings> {
  const user = normalizePermissions(userSettings?.permissions);
  const project = normalizePermissions(projectSettings?.permissions);

  return {
    allow: mergePermissionLists(user.allow, project.allow),
    deny: mergePermissionLists(user.deny, project.deny),
    ask: mergePermissionLists(user.ask, project.ask),
    defaultMode: project.defaultMode !== "allowAll" ? project.defaultMode : user.defaultMode,
  };
}

export function resolveSettingsSources(
  userSettings: CropcodeSettings | null | undefined,
  projectSettings: CropcodeSettings | null | undefined,
  defaults: { model: string; baseURL: string },
  processEnv: SettingsProcessEnv = process.env
): ResolvedCropcodeSettings {
  const userEnv = normalizeEnv(userSettings?.env);
  const projectEnv = normalizeEnv(projectSettings?.env);
  const systemEnv = collectCropcodeEnv(processEnv);
  const env = {
    ...userEnv,
    ...projectEnv,
    ...systemEnv,
  };

  const model =
    trimString(systemEnv.MODEL) ||
    trimString(projectSettings?.model) ||
    trimString(projectEnv.MODEL) ||
    trimString(userSettings?.model) ||
    trimString(userEnv.MODEL) ||
    defaults.model;

  const thinkingEnabled =
    parseBoolean(systemEnv.THINKING_ENABLED) ??
    parseBoolean(projectSettings?.thinkingEnabled) ??
    parseBoolean(projectEnv.THINKING_ENABLED) ??
    parseBoolean(userSettings?.thinkingEnabled) ??
    parseBoolean(userEnv.THINKING_ENABLED) ??
    defaultsToThinkingMode(model);

  const reasoningEffort =
    resolveReasoningEffort(systemEnv.REASONING_EFFORT) ??
    resolveReasoningEffort(projectSettings?.reasoningEffort) ??
    resolveReasoningEffort(projectEnv.REASONING_EFFORT) ??
    resolveReasoningEffort(userSettings?.reasoningEffort) ??
    resolveReasoningEffort(userEnv.REASONING_EFFORT) ??
    "max";

  const debugLogEnabled =
    parseBoolean(systemEnv.DEBUG_LOG_ENABLED) ??
    parseBoolean(projectSettings?.debugLogEnabled) ??
    parseBoolean(projectEnv.DEBUG_LOG_ENABLED) ??
    parseBoolean(userSettings?.debugLogEnabled) ??
    parseBoolean(userEnv.DEBUG_LOG_ENABLED) ??
    false;

  const temperature =
    parseTemperature(systemEnv.TEMPERATURE) ??
    parseTemperature(projectSettings?.temperature) ??
    parseTemperature(projectEnv.TEMPERATURE) ??
    parseTemperature(userSettings?.temperature) ??
    parseTemperature(userEnv.TEMPERATURE);

  const notify =
    trimString(systemEnv.NOTIFY) || trimString(projectSettings?.notify) || trimString(userSettings?.notify) || "";
  const webSearchTool =
    trimString(systemEnv.WEB_SEARCH_TOOL) ||
    trimString(projectSettings?.webSearchTool) ||
    trimString(userSettings?.webSearchTool) ||
    "";

  const permissions = mergePermissions(userSettings, projectSettings);

  return {
    env,
    apiKey: trimString(env.API_KEY) || undefined,
    baseURL: trimString(env.BASE_URL) || defaults.baseURL,
    model,
    temperature,
    thinkingEnabled,
    reasoningEffort,
    debugLogEnabled,
    notify: notify || undefined,
    webSearchTool: webSearchTool || undefined,
    mcpServers: mergeMcpServers(userSettings, projectSettings, userEnv, projectEnv, systemEnv),
    disabledSkills: mergeDisabledSkills(userSettings, projectSettings),
    enabledSkills: mergeEnabledSkills(userSettings, projectSettings),
    permissions,
  };
}

export function resolveSettings(
  settings: CropcodeSettings | null | undefined,
  defaults: { model: string; baseURL: string },
  processEnv: SettingsProcessEnv = process.env
): ResolvedCropcodeSettings {
  return resolveSettingsSources(settings, null, defaults, processEnv);
}

export function modelConfigKey(config: Pick<ModelConfigSelection, "thinkingEnabled" | "reasoningEffort">): string {
  return config.thinkingEnabled ? `thinking:${config.reasoningEffort}` : "thinking:none";
}

export function applyModelConfigSelection(
  settings: CropcodeSettings | null | undefined,
  current: ModelConfigSelection,
  selected: ModelConfigSelection
): { settings: CropcodeSettings; changed: boolean } {
  const changed = selected.model !== current.model || modelConfigKey(selected) !== modelConfigKey(current);
  const next: CropcodeSettings = { ...(settings ?? {}) };

  if (!changed) {
    return { settings: next, changed: false };
  }

  if (selected.model !== current.model || Object.prototype.hasOwnProperty.call(next, "model")) {
    next.model = selected.model;
  } else {
    delete next.model;
  }

  next.thinkingEnabled = selected.thinkingEnabled;
  if (selected.thinkingEnabled) {
    next.reasoningEffort = selected.reasoningEffort;
  }

  return { settings: next, changed: true };
}

// ---------------------------------------------------------------------------
// Settings file I/O
// ---------------------------------------------------------------------------

export function getUserSettingsPath(): string {
  return path.join(os.homedir(), ".cropcode", "settings.json");
}

export function getProjectSettingsPath(projectRoot: string): string {
  return path.join(projectRoot, ".cropcode", "settings.json");
}

export function readSettingsFile(settingsPath: string): CropcodeSettings | null {
  try {
    if (!fs.existsSync(settingsPath)) {
      return null;
    }
    const raw = fs.readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw);
    const result = cropcodeSettingsSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    return result.data as CropcodeSettings;
  } catch {
    return null;
  }
}

export function readSettings(): CropcodeSettings | null {
  return readSettingsFile(getUserSettingsPath());
}

export function readProjectSettings(projectRoot: string = process.cwd()): CropcodeSettings | null {
  return readSettingsFile(getProjectSettingsPath(projectRoot));
}

function writeSettingsFile(settingsPath: string, settings: CropcodeSettings): void {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export function writeSettings(settings: CropcodeSettings): void {
  const settingsPath = getUserSettingsPath();
  writeSettingsFile(settingsPath, settings);
}

export function writeProjectSettings(settings: CropcodeSettings, projectRoot: string = process.cwd()): void {
  const settingsPath = getProjectSettingsPath(projectRoot);
  writeSettingsFile(settingsPath, settings);
}

export function writeModelConfigSelection(
  selection: ModelConfigSelection,
  current: ModelConfigSelection = resolveCurrentSettings(),
  projectRoot: string = process.cwd()
): { changed: boolean; settings: CropcodeSettings } {
  const projectSettingsPath = getProjectSettingsPath(projectRoot);
  const shouldWriteProjectSettings = fs.existsSync(projectSettingsPath);
  const rawSettings = shouldWriteProjectSettings ? readProjectSettings(projectRoot) : readSettings();
  const result = applyModelConfigSelection(rawSettings, current, selection);
  if (result.changed) {
    if (shouldWriteProjectSettings) {
      writeProjectSettings(result.settings, projectRoot);
    } else {
      writeSettings(result.settings);
    }
  }
  return result;
}

export function resolveCurrentSettings(projectRoot: string = process.cwd()): ResolvedCropcodeSettings {
  return resolveSettingsSources(
    readSettings(),
    readProjectSettings(projectRoot),
    {
      model: DEFAULT_MODEL,
      baseURL: DEFAULT_BASE_URL,
    },
    process.env
  );
}
