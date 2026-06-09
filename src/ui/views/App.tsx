import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Static, Text, useApp, useStdout, useWindowSize } from "ink";
import chalk from "chalk";
import * as fs from "fs";
import { createOpenAIClient } from "../../common/openai-client";
import { listMarketplaces, listInstalledPlugins } from "../../marketplace";
import {
  type LlmStreamProgress,
  type MessageMeta,
  type SessionEntry,
  SessionManager,
  type SessionMessage,
  type SessionStatus,
  type SkillInfo,
  type UndoTarget,
  type UserPromptContent,
} from "../../session";
import {
  applyModelConfigSelection,
  type DeepcodingSettings,
  type ModelConfigSelection,
  type PermissionDefaultMode,
  type PermissionScope,
  type ResolvedDeepcodingSettings,
  resolveSettingsSources,
  readSettings,
  readProjectSettings,
  writeSettings,
  writeProjectSettings,
  getProjectSettingsPath,
  type ReasoningEffort,
} from "../../settings";
import { PromptInput, type PromptDraft, type PromptSubmission } from "./PromptInput";
import { MessageView, RawModeExitPrompt } from "../components";
import { SessionList } from "./SessionList";
import { UndoSelector, type UndoRestoreMode } from "./UndoSelector";
import { buildLoadingText } from "../core/loading-text";
import { findExpandedThinkingId } from "../core/thinking-state";
import { WelcomeScreen } from "./WelcomeScreen";
import { LoginScreen } from "../LoginScreen";
import {
  hasCredentials,
  getActiveApiKey,
  getActiveBaseURL,
  getActiveModel,
  getActiveCredential,
  setActiveCredential,
  getActiveThinkingEnabled,
  getActiveReasoningEffort,
} from "../../common/providers";
import { BUILTIN_PROVIDERS } from "../../common/provider-presets";
import { AskUserQuestionPrompt } from "./AskUserQuestionPrompt";
import { McpStatusList } from "./McpStatusList";
import { PermissionPrompt, type PermissionPromptResult } from "./PermissionPrompt";
import type { AskPermissionRequest, UserToolPermission } from "../../common/permissions";
import { ProcessStdoutView } from "./ProcessStdoutView";
import {
  type AskUserQuestionAnswers,
  findPendingAskUserQuestion,
  formatAskUserQuestionAnswers,
} from "../core/ask-user-question";
import { buildExitSummaryText } from "../exit-summary";
import { RawMode, useRawModeContext } from "../contexts";
import { renderMessageToStdout } from "../components/MessageView/utils";
import { ANSI_CLEAR_SCREEN } from "../constants";
import {
  buildSyntheticUserMessage,
  buildStatusLine,
  formatModelConfig,
  isCurrentSessionEmpty,
  extractImageUrlsFromContentParams,
} from "../utils";

// Derive defaults from the first provider preset instead of hardcoding a specific vendor
const FIRST_PROVIDER = BUILTIN_PROVIDERS[0];
const DEFAULT_MODEL = FIRST_PROVIDER?.models[0]?.id ?? "deepseek-v4-pro";
const DEFAULT_BASE_URL = FIRST_PROVIDER?.baseURL ?? "https://api.deepseek.com";

type View = "chat" | "session-list" | "undo" | "mcp-status" | "login";

type AppProps = {
  projectRoot: string;
  initialPrompt?: string;
  onRestart?: () => void;
};

export function App({ projectRoot, initialPrompt, onRestart }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout, write } = useStdout();
  const { columns, rows } = useWindowSize();
  const { mode, setMode } = useRawModeContext();
  const initialPromptSubmittedRef = useRef(false);
  const processStdoutRef = useRef<Map<number, string>>(new Map());
  const rawModeRef = useRef<RawMode>(mode);
  const writeRef = useRef(write);
  const lastRenderedColumnsRef = useRef<number | null>(null);
  const messagesRef = useRef<SessionMessage[]>([]);
  // Existing users with settings.json API keys should not be forced into login
  const hasLegacyApiKey = (() => {
    try {
      const s = resolveCurrentSettings(projectRoot);
      return !!s.apiKey;
    } catch {
      return false;
    }
  })();
  const [view, setView] = useState<View>(hasCredentials() || hasLegacyApiKey ? "chat" : "login");
  const [busy, setBusy] = useState(false);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [undoTargets, setUndoTargets] = useState<UndoTarget[]>([]);
  const [promptDraft, setPromptDraft] = useState<PromptDraft | null>(null);
  const [statusLine, setStatusLine] = useState<string>("");
  const [errorLine, setErrorLine] = useState<string | null>(null);
  const [streamProgress, setStreamProgress] = useState<LlmStreamProgress | null>(null);
  const [runningProcesses, setRunningProcesses] = useState<SessionEntry["processes"]>(null);
  const [activeStatus, setActiveStatus] = useState<SessionStatus | null>(null);
  const [askPermissions, setAskPermissions] = useState<AskPermissionRequest[]>([]);
  const [pendingPermissionReply, setPendingPermissionReply] = useState<{
    sessionId: string;
    permissions: UserToolPermission[];
    alwaysAllows: PermissionScope[];
  } | null>(null);
  const [dismissedQuestionIds, setDismissedQuestionIds] = useState<Set<string>>(() => new Set());
  const [isExiting, setIsExiting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeNonce, setWelcomeNonce] = useState(0);
  const [resolvedSettings, setResolvedSettings] = useState(() => resolveCurrentSettings(projectRoot));
  const [nowTick, setNowTick] = useState(0);
  const [mcpStatuses, setMcpStatuses] = useState<ReturnType<typeof sessionManager.getMcpStatus>>([]);
  const [showProcessStdout, setShowProcessStdout] = useState(false);

  // Throttle stream progress updates: LLM fires events per-token (~10-50ms),
  // but React+Ink can't re-render that fast without visible flicker. Batch at ~200ms.
  const streamProgressRef = useRef<LlmStreamProgress | null>(null);
  const lastProgressFlushRef = useRef(0);
  const PROGRESS_FLUSH_INTERVAL = 200;

  rawModeRef.current = mode;
  messagesRef.current = messages;

  const sessionManager = useMemo(() => {
    return new SessionManager({
      projectRoot,
      createOpenAIClient: () => createOpenAIClient(projectRoot),
      getResolvedSettings: () => resolveCurrentSettings(projectRoot),
      renderMarkdown: (text) => text,
      onAssistantMessage: (message: SessionMessage) => {
        setMessages((prev) => [...prev, message]);
        if (rawModeRef.current === RawMode.Raw) {
          process.stdout.write("\n");
          process.stdout.write(renderMessageToStdout(message, rawModeRef.current) + "\n\n");
        }
      },
      onSessionEntryUpdated: (entry) => {
        setStatusLine(buildStatusLine(entry));
        setRunningProcesses(entry.processes);
        setActiveStatus(entry.status);
        setAskPermissions(entry.askPermissions ?? []);
      },
      onLlmStreamProgress: (progress) => {
        if (progress.phase === "end") {
          streamProgressRef.current = null;
          lastProgressFlushRef.current = 0;
          setStreamProgress(null);
          return;
        }
        streamProgressRef.current = progress;
        const now = Date.now();
        if (now - lastProgressFlushRef.current >= PROGRESS_FLUSH_INTERVAL) {
          lastProgressFlushRef.current = now;
          setStreamProgress(progress);
        }
      },
      onMcpStatusChanged: () => {
        // 当 MCP 状态变更时，如果当前正在查看 MCP 状态页面，则更新显示
        setMcpStatuses(sessionManager.getMcpStatus());
      },
      onProcessStdout: (pid, chunk) => {
        const buf = processStdoutRef.current;
        const current = buf.get(pid) ?? "";
        // Cap at 1 MB per process to avoid unbounded memory growth
        // on noisy or long-running commands like `yes` or verbose builds.
        const MAX_STDOUT_BUFFER = 1_000_000;
        if (current.length >= MAX_STDOUT_BUFFER) {
          return;
        }
        const text = typeof chunk === "string" ? chunk : String(chunk);
        const available = MAX_STDOUT_BUFFER - current.length;
        buf.set(pid, current + text.slice(0, available));
      },
    });
  }, [projectRoot]);

  useEffect(() => {
    if (!busy) {
      return;
    }
    const id = setInterval(() => setNowTick((tick) => tick + 1), 500);
    return () => clearInterval(id);
  }, [busy]);

  function loadVisibleMessages(manager: SessionManager, sessionId: string): SessionMessage[] {
    return manager.listSessionMessages(sessionId).filter((m) => m.visible);
  }

  const refreshSessionsList = useCallback((): void => {
    setSessions(sessionManager.listSessions());
  }, [sessionManager]);

  const refreshSkills = useCallback(
    async (sessionId?: string): Promise<void> => {
      try {
        const list = await sessionManager.listSkills(sessionId ?? sessionManager.getActiveSessionId() ?? undefined);
        setSkills(list);
      } catch {
        // ignore
      }
    },
    [sessionManager]
  );

  const navigateToSubView = useCallback((targetView: View) => {
    setShowWelcome(false);
    setView(targetView);
  }, []);

  const resetStaticView = useCallback(
    (loadedMessages: SessionMessage[], options?: { clearScreen?: boolean }) => {
      if (options?.clearScreen) {
        process.stdout.write(ANSI_CLEAR_SCREEN);
      }
      setMessages([]);
      setWelcomeNonce((n) => n + 1);
      navigateToSubView("chat");
      setTimeout(() => {
        setMessages(loadedMessages);
        setShowWelcome(true);
      }, 0);
    },
    [navigateToSubView]
  );

  const resetToWelcome = useCallback(async () => {
    process.stdout.write(ANSI_CLEAR_SCREEN);
    sessionManager.setActiveSessionId(null);
    setStatusLine("");
    setErrorLine(null);
    setRunningProcesses(null);
    setActiveStatus(null);
    setAskPermissions([]);
    setPendingPermissionReply(null);
    setDismissedQuestionIds(new Set());
    resetStaticView([]);
    await refreshSkills();
  }, [sessionManager, resetStaticView, refreshSkills]);

  useEffect(() => {
    refreshSessionsList();
    void refreshSkills();
  }, [refreshSessionsList, refreshSkills]);

  // Eagerly create the OpenAI client on mount so the TCP+TLS connection
  // warmup (fire-and-forget inside createOpenAIClient) starts before the
  // user sends their first prompt.
  useEffect(() => {
    createOpenAIClient(projectRoot);
  }, [projectRoot]);

  useLayoutEffect(() => {
    const settings = resolveCurrentSettings(projectRoot);
    void sessionManager.initMcpServers(settings.mcpServers);
  }, [projectRoot, sessionManager]);

  useEffect(() => {
    return () => {
      sessionManager.dispose();
    };
  }, [sessionManager]);

  writeRef.current = write;
  const handlePrompt = useCallback(
    async (submission: PromptSubmission) => {
      if (submission.command === "exit") {
        setIsExiting(true);
        setTimeout(() => {
          const activeSessionId = sessionManager.getActiveSessionId();
          const session = activeSessionId ? sessionManager.getSession(activeSessionId) : null;
          const summary = buildExitSummaryText({ session });
          process.stdout.write("\n");
          process.stdout.write(chalk.rgb(34, 154, 195)("> /exit "));
          process.stdout.write("\n\n");
          process.stdout.write(summary);
          process.stdout.write("\n\n");
          sessionManager.dispose();
          exit();
        }, 0);
        return;
      }
      if (submission.command === "new") {
        if (onRestart) {
          onRestart();
        } else {
          await resetToWelcome();
          refreshSessionsList();
        }
        return;
      }
      if (submission.command === "resume") {
        refreshSessionsList();
        navigateToSubView("session-list");
        return;
      }
      if (submission.command === "continue" && isCurrentSessionEmpty(sessionManager)) {
        refreshSessionsList();
        navigateToSubView("session-list");
        return;
      }
      if (submission.command === "undo") {
        const activeSessionId = sessionManager.getActiveSessionId();
        if (!activeSessionId) {
          setErrorLine("No active session to undo.");
          return;
        }
        setUndoTargets(sessionManager.listUndoTargets(activeSessionId));
        navigateToSubView("undo");
        return;
      }
      if (submission.command === "login") {
        navigateToSubView("login");
        return;
      }
      if (submission.command === "mcp") {
        setMcpStatuses(sessionManager.getMcpStatus());
        navigateToSubView("mcp-status");
        return;
      }
      if (submission.command === "marketplace") {
        setShowWelcome(false);
        try {
          const marketplaces = listMarketplaces();
          const lines: string[] = [];
          if (marketplaces.length === 0) {
            lines.push("No marketplaces registered.");
            lines.push("Use: cropcode marketplace add <git-url|github-repo|local-path>");
          } else {
            lines.push(`Registered marketplaces (${marketplaces.length}):`);
            for (const mp of marketplaces) {
              lines.push(`  [${mp.name}]${mp.manifest?.description ? ` — ${mp.manifest.description}` : ""}`);
              if (mp.manifest) {
                for (const p of mp.manifest.plugins) {
                  lines.push(`    - ${p.name}: ${p.description}`);
                }
              }
            }
          }
          lines.push("");
          lines.push("Commands:");
          lines.push("  cropcode marketplace add <url>      Register a marketplace");
          lines.push("  cropcode marketplace remove <name>  Remove a marketplace");
          lines.push("  cropcode plugin install <n>@<m>     Install a plugin");
          lines.push("  cropcode plugin list                List installed plugins");
          lines.push("  cropcode plugin remove <name>       Remove a plugin");
          const now = new Date().toISOString();
          setMessages((prev) => [
            ...prev,
            {
              id: `local-${Math.random().toString(36).slice(2)}`,
              sessionId: "local",
              role: "system",
              content: lines.join("\n"),
              contentParams: null,
              messageParams: null,
              compacted: false,
              visible: true,
              createTime: now,
              updateTime: now,
              meta: { kind: "marketplace" },
            },
          ]);
        } catch (error) {
          const now = new Date().toISOString();
          setMessages((prev) => [
            ...prev,
            {
              id: `local-${Math.random().toString(36).slice(2)}`,
              sessionId: "local",
              role: "system",
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
              contentParams: null,
              messageParams: null,
              compacted: false,
              visible: true,
              createTime: now,
              updateTime: now,
              meta: { kind: "error" },
            },
          ]);
        }
        return;
      }
      if (submission.command === "plugin") {
        setShowWelcome(false);
        try {
          const plugins = listInstalledPlugins();
          const lines: string[] = [];
          if (plugins.length === 0) {
            lines.push("No plugins installed.");
            lines.push("Use: cropcode plugin install <name>@<marketplace>");
          } else {
            lines.push(`Installed plugins (${plugins.length}):`);
            for (const { name, config } of plugins) {
              lines.push(`  - ${name} (from ${config.marketplace}, installed ${config.installedAt.split("T")[0]})`);
            }
          }
          lines.push("");
          lines.push("Commands:");
          lines.push("  cropcode plugin install <n>@<m>  Install a plugin");
          lines.push("  cropcode plugin remove <name>   Remove a plugin");
          const now = new Date().toISOString();
          setMessages((prev) => [
            ...prev,
            {
              id: `local-${Math.random().toString(36).slice(2)}`,
              sessionId: "local",
              role: "system",
              content: lines.join("\n"),
              contentParams: null,
              messageParams: null,
              compacted: false,
              visible: true,
              createTime: now,
              updateTime: now,
              meta: { kind: "plugin" },
            },
          ]);
        } catch (error) {
          const now = new Date().toISOString();
          setMessages((prev) => [
            ...prev,
            {
              id: `local-${Math.random().toString(36).slice(2)}`,
              sessionId: "local",
              role: "system",
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
              contentParams: null,
              messageParams: null,
              compacted: false,
              visible: true,
              createTime: now,
              updateTime: now,
              meta: { kind: "error" },
            },
          ]);
        }
        return;
      }

      const prompt: UserPromptContent = {
        text: submission.text,
        imageUrls: submission.imageUrls,
        skills:
          submission.selectedSkills && submission.selectedSkills.length > 0 ? submission.selectedSkills : undefined,
        permissions: submission.permissions,
        alwaysAllows: submission.alwaysAllows,
      };
      const activeSessionId = sessionManager.getActiveSessionId();
      const permissionReply =
        pendingPermissionReply && activeSessionId === pendingPermissionReply.sessionId ? pendingPermissionReply : null;
      if (permissionReply) {
        prompt.permissions = permissionReply.permissions;
        prompt.alwaysAllows = permissionReply.alwaysAllows;
      }

      const trimmedText = (submission.text ?? "").trim();
      const selectedSkillNames = submission.selectedSkills?.map((skill) => skill.name).filter(Boolean) ?? [];
      const userDisplayContent =
        trimmedText ||
        (selectedSkillNames.length > 0 ? `Use skills: ${selectedSkillNames.join(", ")}` : "") ||
        (submission.imageUrls.length > 0 ? "[Image]" : "");

      if (userDisplayContent && submission.command !== "continue") {
        setMessages((prev) => [...prev, buildSyntheticUserMessage(userDisplayContent, submission.imageUrls.length)]);
      }

      setBusy(true);
      setErrorLine(null);
      setRunningProcesses(null);
      setShowProcessStdout(false);
      processStdoutRef.current.clear();
      try {
        await sessionManager.handleUserPrompt(prompt);
        if (permissionReply) {
          setPendingPermissionReply(null);
        }
        await refreshSkills();
        refreshSessionsList();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setErrorLine(message);
      } finally {
        setBusy(false);
        setStreamProgress(null);
        setRunningProcesses(null);
      }
    },
    [
      exit,
      onRestart,
      sessionManager,
      pendingPermissionReply,
      refreshSkills,
      refreshSessionsList,
      navigateToSubView,
      resetToWelcome,
    ]
  );

  const handleInterrupt = useCallback(() => {
    sessionManager.interruptActiveSession();
  }, [sessionManager]);

  const handlePermissionResult = useCallback(
    (result: PermissionPromptResult) => {
      const sessionId = sessionManager.getActiveSessionId();
      if (!sessionId) {
        return;
      }
      setPromptDraft(null);
      if (result.hasDeny) {
        setPendingPermissionReply({
          sessionId,
          permissions: result.permissions,
          alwaysAllows: result.alwaysAllows,
        });
        setStatusLine("Permission denied. Add a reply, then press Enter to continue.");
        sessionManager.denySessionPermission(sessionId);
        return;
      }
      void handlePrompt({
        text: "/continue",
        imageUrls: [],
        command: "continue",
        permissions: result.permissions,
        alwaysAllows: result.alwaysAllows,
      });
    },
    [handlePrompt, sessionManager]
  );

  const handlePermissionCancel = useCallback(() => {
    sessionManager.interruptActiveSession();
    setActiveStatus("interrupted");
    setAskPermissions([]);
    setPendingPermissionReply(null);
    setPromptDraft(null);
    refreshSessionsList();
  }, [refreshSessionsList, sessionManager]);

  const handleToggleProcessStdout = useCallback(() => {
    setShowProcessStdout(true);
  }, []);

  const handleDismissProcessStdout = useCallback(() => {
    setShowProcessStdout(false);
  }, []);

  const handleAdjustBashTimeout = useCallback(
    (deltaMs: number) => sessionManager.adjustActiveBashTimeout(deltaMs),
    [sessionManager]
  );

  const handleModelConfigChange = useCallback(
    (selection: ModelConfigSelection): string => {
      const current = resolveCurrentSettings(projectRoot);
      const { changed } = writeModelConfigSelection(selection, current, projectRoot);
      // Sync model change to credentials.json if active provider exists
      const cred = getActiveCredential();
      if (cred) {
        setActiveCredential(
          cred.providerId,
          cred.apiKey,
          selection.model,
          cred.mode,
          selection.thinkingEnabled,
          selection.reasoningEffort
        );
      }
      const next = resolveCurrentSettings(projectRoot);
      setResolvedSettings(next);

      if (!changed) {
        return "Model settings unchanged";
      }

      const activeSessionId = sessionManager.getActiveSessionId();
      const meta: MessageMeta = {
        isModelChange: true,
      };
      const content = `/model\n└ Set model to ${selection.model} (${selection?.thinkingEnabled ? selection?.reasoningEffort : "no thinking"})`;

      if (activeSessionId) {
        sessionManager.addSessionSystemMessage(activeSessionId, content, true, meta);
      } else {
        const now = new Date().toISOString();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sessionId: "local",
            role: "system" as const,
            content,
            contentParams: null,
            messageParams: null,
            compacted: false,
            visible: true,
            createTime: now,
            updateTime: now,
            meta,
          },
        ]);
      }

      return `Model settings updated: ${formatModelConfig(current)} → ${formatModelConfig(next)}`;
    },
    [projectRoot, sessionManager]
  );

  const hasProjectSettings = useMemo(() => fs.existsSync(getProjectSettingsPath(projectRoot)), [projectRoot]);

  const handlePermissionsChange = useCallback(
    (mode: PermissionDefaultMode, saveTarget: "user" | "project"): string => {
      const target = saveTarget === "project" ? readProjectSettings(projectRoot) : readSettings();
      const currentMode = target?.permissions?.defaultMode ?? "allowAll";
      if (currentMode === mode) {
        return "Permission mode unchanged";
      }
      const updated: DeepcodingSettings = {
        ...target,
        permissions: {
          ...target?.permissions,
          defaultMode: mode,
        },
      };
      if (saveTarget === "project") {
        writeProjectSettings(updated, projectRoot);
      } else {
        writeSettings(updated);
      }
      const next = resolveCurrentSettings(projectRoot);
      setResolvedSettings(next);

      const activeSessionId = sessionManager.getActiveSessionId();
      const content = `/permissions\n└ Set permission mode to ${mode} (${saveTarget}-level)`;
      if (activeSessionId) {
        sessionManager.addSessionSystemMessage(activeSessionId, content, true);
      } else {
        const now = new Date().toISOString();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sessionId: "local",
            role: "system" as const,
            content,
            contentParams: null,
            messageParams: null,
            compacted: false,
            visible: true,
            createTime: now,
            updateTime: now,
          },
        ]);
      }
      const effectiveMode = next.permissions.defaultMode;
      if (effectiveMode !== mode) {
        return `Saved ${mode} to ${saveTarget}-level, but effective mode is ${effectiveMode} (project-level overrides)`;
      }
      return `Permission mode: ${currentMode} → ${mode} (${saveTarget}-level)`;
    },
    [projectRoot, sessionManager]
  );

  const handleSubmit = useCallback(
    (submission: PromptSubmission) => {
      void handlePrompt(submission);
    },
    [handlePrompt]
  );

  const reloadActiveSessionView = useCallback(
    (sessionId: string): void => {
      resetStaticView(loadVisibleMessages(sessionManager, sessionId), { clearScreen: true });
    },
    [resetStaticView, sessionManager]
  );

  useEffect(() => {
    if (initialPromptSubmittedRef.current || !initialPrompt || !initialPrompt.trim()) {
      return;
    }

    initialPromptSubmittedRef.current = true;
    handleSubmit({
      text: initialPrompt,
      imageUrls: [],
      selectedSkills: undefined,
    });
  }, [handleSubmit, initialPrompt]);

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      const currentSessionId = sessionManager.getActiveSessionId();
      if (currentSessionId !== sessionId) {
        process.stdout.write(ANSI_CLEAR_SCREEN);
      }
      sessionManager.setActiveSessionId(sessionId);
      resetStaticView(loadVisibleMessages(sessionManager, sessionId));
      const session = sessionManager.getSession(sessionId);
      setStatusLine(session ? buildStatusLine(session) : "");
      setRunningProcesses(session?.processes ?? null);
      setActiveStatus(session?.status ?? null);
      setAskPermissions(session?.askPermissions ?? []);
      if (pendingPermissionReply && pendingPermissionReply.sessionId !== sessionId) {
        setPendingPermissionReply(null);
      }
      await refreshSkills(sessionId);
    },
    [sessionManager, resetStaticView, pendingPermissionReply, refreshSkills]
  );

  const handleDeleteSession = useCallback(
    (sessionId: string): void => {
      const activeSessionId = sessionManager.getActiveSessionId();
      sessionManager.deleteSession(sessionId);
      if (sessionId === activeSessionId) {
        sessionManager.setActiveSessionId(null);
        setShowWelcome(true);
        setView("chat");
      }
      refreshSessionsList();
    },
    [sessionManager, refreshSessionsList]
  );

  const handleUndoRestore = useCallback(
    async (target: UndoTarget, restoreMode: UndoRestoreMode): Promise<void> => {
      const sessionId = sessionManager.getActiveSessionId();
      if (!sessionId) {
        setErrorLine("No active session to undo.");
        setView("chat");
        setShowWelcome(true);
        return;
      }

      const errors: string[] = [];
      if (restoreMode === "code-and-conversation") {
        try {
          sessionManager.restoreSessionCode(sessionId, target.message.id);
        } catch (error) {
          errors.push(`Code restore failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      let conversationRestored = false;
      try {
        sessionManager.restoreSessionConversation(sessionId, target.message.id);
        conversationRestored = true;
      } catch (error) {
        errors.push(`Conversation restore failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      refreshSessionsList();
      await refreshSkills(sessionId);
      setErrorLine(errors.length > 0 ? errors.join(" ") : null);
      if (conversationRestored) {
        setPromptDraft(buildPromptDraftFromSessionMessage(target.message, Date.now()));
      }
      reloadActiveSessionView(sessionId);
    },
    [reloadActiveSessionView, refreshSessionsList, refreshSkills, sessionManager]
  );

  const handleRawModeChange = useCallback(
    (nextMode: string) => {
      const activeSessionId = sessionManager.getActiveSessionId();
      setMode(nextMode as RawMode);
      // Reset chat view state synchronously so the transition frame does not
      // re-render a stale welcome screen before handleSelectSession runs.
      setShowWelcome(false);
      setMessages([]);
      // Clear screen to remove stale formatted text.
      process.stdout.write("\u001B[2J\u001B[3J\u001B[H");

      setTimeout(() => {
        if (nextMode === RawMode.Raw) {
          // Write all messages directly to stdout for raw scrollback mode.
          const allMessages = activeSessionId ? loadVisibleMessages(sessionManager, activeSessionId) : [];
          for (const msg of allMessages) {
            process.stdout.write("\n");
            process.stdout.write(renderMessageToStdout(msg, nextMode) + "\n\n");
          }
          if (allMessages.length > 0) {
            process.stdout.write("\n\n");
            process.stdout.write(chalk.dim("Press ESC to exit raw mode"));
          } else {
            process.stdout.write("\n");
            process.stdout.write(chalk.dim("(No messages in this session yet. Start chatting to see them here.)"));
            process.stdout.write("\n\n");
            process.stdout.write(chalk.dim("Press ESC to exit raw mode"));
          }
        } else if (activeSessionId) {
          // Switch to chat view to render messages.
          handleSelectSession(activeSessionId);
        } else {
          // No active session: just show the welcome screen once.
          setWelcomeNonce((n) => n + 1);
          setShowWelcome(true);
        }
      }, 200);
    },
    [handleSelectSession, sessionManager, setMode]
  );

  useEffect(() => {
    if (!stdout?.isTTY) {
      return;
    }
    if (columns <= 0) {
      return;
    }
    if (lastRenderedColumnsRef.current === null) {
      lastRenderedColumnsRef.current = columns;
      return;
    }
    if (lastRenderedColumnsRef.current === columns) {
      return;
    }
    lastRenderedColumnsRef.current = columns;

    if (mode === RawMode.Raw) {
      // In raw mode, re-render all messages directly to stdout at the new width.
      // Use process.stdout.write instead of writeRef to avoid Ink interference.
      process.stdout.write("\u001B[2J\u001B[3J\u001B[H");
      const activeSessionId = sessionManager.getActiveSessionId();
      const allMessages = activeSessionId ? loadVisibleMessages(sessionManager, activeSessionId) : [];
      for (const msg of allMessages) {
        process.stdout.write("\n");
        process.stdout.write(renderMessageToStdout(msg, mode) + "\n\n");
      }
      if (allMessages.length > 0) {
        process.stdout.write("\n\n");
        process.stdout.write(chalk.dim("Press ESC to exit raw mode"));
      } else {
        process.stdout.write("\n");
        process.stdout.write(chalk.dim("(No messages in this session yet. Start chatting to see them here.)"));
        process.stdout.write("\n\n");
        process.stdout.write(chalk.dim("Press ESC to exit raw mode"));
      }
      return;
    }

    // Force full redraw on terminal resize to avoid stale wrapped rows.
    writeRef.current("\u001B[2J\u001B[H");

    setMessages([]);
    setShowWelcome(false);
    setWelcomeNonce((n) => n + 1);

    const activeSessionId = sessionManager.getActiveSessionId();
    const nextMessages =
      activeSessionId && !busy ? loadVisibleMessages(sessionManager, activeSessionId) : messagesRef.current;
    setTimeout(() => {
      setMessages(nextMessages);
      setShowWelcome(true);
    }, 0);
  }, [busy, mode, sessionManager, columns, stdout]);

  const screenWidth = useMemo(() => columns ?? stdout?.columns ?? 80, [columns, stdout]);
  const screenHeight = useMemo(() => rows ?? stdout?.rows ?? 24, [rows, stdout]);
  const totalTokens = useMemo(
    () => sessions.reduce((sum, s) => sum + (typeof s.usage?.total_tokens === "number" ? s.usage.total_tokens : 0), 0),
    [sessions]
  );
  const promptHistory = useMemo(() => {
    return messages
      .filter((message) => message.role === "user" && typeof message.content === "string")
      .map((message) => (message.content ?? "").trim())
      .filter((content) => content.length > 0);
  }, [messages]);
  const expandedThinkingId = findExpandedThinkingId(messages);
  const pendingQuestion = useMemo(() => findPendingAskUserQuestion(messages, activeStatus), [activeStatus, messages]);
  const shouldShowQuestionPrompt = Boolean(pendingQuestion && !dismissedQuestionIds.has(pendingQuestion.messageId));
  // Flush any pending stream progress that was throttled
  useEffect(() => {
    if (streamProgressRef.current) {
      setStreamProgress(streamProgressRef.current);
    }
  }, [nowTick]);

  const loadingText = useMemo(
    () => (busy ? buildLoadingText({ progress: streamProgress, processes: runningProcesses, now: Date.now() }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nowTick forces periodic recalculation for spinner animation
    [busy, streamProgress, runningProcesses, nowTick]
  );

  const welcomeItem: SessionMessage = useMemo(
    () => ({
      id: `__welcome__${welcomeNonce}`,
      sessionId: "",
      role: "system",
      content: "",
      contentParams: null,
      messageParams: null,
      compacted: false,
      visible: true,
      createTime: "",
      updateTime: "",
    }),
    [welcomeNonce]
  );
  const staticItems = useMemo(() => {
    if (mode === RawMode.Raw) {
      return [];
    }
    if (showWelcome && view === "chat") {
      return [welcomeItem, ...messages];
    }
    return messages;
  }, [mode, showWelcome, view, messages, welcomeItem]);

  const handleQuestionAnswers = useCallback(
    (answers: AskUserQuestionAnswers) => {
      void handlePrompt({
        text: formatAskUserQuestionAnswers(answers),
        imageUrls: [],
      });
    },
    [handlePrompt]
  );

  const handleQuestionCancel = useCallback(() => {
    if (!pendingQuestion) {
      return;
    }
    setDismissedQuestionIds((prev) => new Set(prev).add(pendingQuestion.messageId));
  }, [pendingQuestion]);

  if (mode === RawMode.Raw) {
    return <RawModeExitPrompt onExit={(prev) => handleRawModeChange(prev)} />;
  }

  return (
    <Box flexDirection="column" width={screenWidth} minWidth={80} overflowX={"visible"}>
      <Static items={staticItems}>
        {(item) => {
          if (item.id.startsWith("__welcome__")) {
            return (
              <WelcomeScreen
                key={item.id}
                projectRoot={projectRoot}
                settings={resolvedSettings}
                skills={skills}
                width={screenWidth}
                totalTokens={totalTokens}
              />
            );
          }
          return (
            <MessageView
              key={item.id}
              message={item}
              collapsed={isCollapsedThinking(item, expandedThinkingId)}
              width={screenWidth}
            />
          );
        }}
      </Static>
      {statusLine ? (
        <Box>
          <Text dimColor>{statusLine}</Text>
        </Box>
      ) : null}
      {errorLine ? (
        <Box>
          <Text color="red">Error: {errorLine}</Text>
        </Box>
      ) : null}
      {showProcessStdout ? (
        <ProcessStdoutView
          processStdoutRef={processStdoutRef}
          runningProcesses={runningProcesses}
          onDismiss={handleDismissProcessStdout}
          onAdjustTimeout={handleAdjustBashTimeout}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      ) : view === "session-list" ? (
        <SessionList
          sessions={sessions}
          onSelect={(id) => void handleSelectSession(id)}
          onCancel={() => setView("chat")}
          onDelete={handleDeleteSession}
        />
      ) : view === "undo" ? (
        <UndoSelector
          targets={undoTargets}
          onSelect={(target, restoreMode) => void handleUndoRestore(target, restoreMode)}
          onCancel={() => {
            setView("chat");
            setShowWelcome(true);
          }}
        />
      ) : view === "login" ? (
        <LoginScreen
          width={screenWidth}
          onComplete={() => {
            const fresh = resolveCurrentSettings(projectRoot);
            setResolvedSettings(fresh);
            setView("chat");
            setShowWelcome(true);
          }}
        />
      ) : view === "mcp-status" ? (
        <McpStatusList
          statuses={mcpStatuses}
          onCancel={() => setView("chat")}
          onReconnect={(name) => {
            const latest = resolveCurrentSettings(projectRoot);
            void sessionManager.reconnectMcpServer(name, latest.mcpServers?.[name]);
          }}
        />
      ) : shouldShowQuestionPrompt && pendingQuestion && !busy ? (
        <AskUserQuestionPrompt
          questions={pendingQuestion.questions}
          onSubmit={handleQuestionAnswers}
          onCancel={handleQuestionCancel}
        />
      ) : activeStatus === "ask_permission" && askPermissions.length > 0 && !pendingPermissionReply && !busy ? (
        <PermissionPrompt
          requests={askPermissions}
          onSubmit={handlePermissionResult}
          onCancel={handlePermissionCancel}
        />
      ) : isExiting ? null : (
        <PromptInput
          projectRoot={projectRoot}
          screenWidth={screenWidth}
          skills={skills}
          modelConfig={resolvedSettings}
          promptHistory={promptHistory}
          busy={busy}
          loadingText={loadingText}
          runningProcesses={runningProcesses}
          promptDraft={promptDraft}
          onSubmit={handleSubmit}
          onModelConfigChange={handleModelConfigChange}
          onPermissionsChange={handlePermissionsChange}
          currentPermissionMode={resolvedSettings.permissions.defaultMode}
          hasProjectSettings={hasProjectSettings}
          onRawModeChange={handleRawModeChange}
          onInterrupt={handleInterrupt}
          onToggleProcessStdout={handleToggleProcessStdout}
          placeholder="Type your message..."
        />
      )}
    </Box>
  );
}

function isCollapsedThinking(message: SessionMessage, expandedId: string | null): boolean {
  if (message.role !== "assistant") {
    return false;
  }
  if (!message.meta?.asThinking) {
    return false;
  }
  return message.id !== expandedId;
}

export function buildPromptDraftFromSessionMessage(message: SessionMessage, nonce: number): PromptDraft {
  return {
    nonce,
    text: typeof message.content === "string" ? message.content : "",
    imageUrls: extractImageUrlsFromContentParams(message.contentParams),
  };
}

export function writeModelConfigSelection(
  selection: ModelConfigSelection,
  current: ModelConfigSelection = resolveCurrentSettings(),
  projectRoot: string = process.cwd()
): { changed: boolean; settings: DeepcodingSettings } {
  const projectSettingsPath = getProjectSettingsPath(projectRoot);
  const shouldWriteProjectSettings = fs.existsSync(projectSettingsPath);
  const rawSettings = shouldWriteProjectSettings ? readProjectSettings(projectRoot) : readSettings();
  const result = applyModelConfigSelection(rawSettings, current, selection);

  // When credentials are active, the model is stored in credentials.json,
  // not settings.json. Skip writing to avoid polluting settings.json with
  // stale model fields that would conflict with credential resolution.
  if (result.changed && !hasCredentials()) {
    if (shouldWriteProjectSettings) {
      writeProjectSettings(result.settings, projectRoot);
    } else {
      writeSettings(result.settings);
    }
  }
  return result;
}

export function resolveCurrentSettings(projectRoot: string = process.cwd()): ResolvedDeepcodingSettings {
  const credApiKey = getActiveApiKey();
  const credBaseURL = getActiveBaseURL();
  const credModel = getActiveModel();
  const credThinkingEnabled = getActiveThinkingEnabled();
  const credReasoningEffort = getActiveReasoningEffort();
  const hasCred = hasCredentials();

  // When credentials exist, use credential values as defaults so they
  // flow through the entire resolution chain rather than a last-step overlay.
  // This prevents stale settings.json model/apiKey fields from leaking through.
  const base = resolveSettingsSources(
    readSettings(),
    readProjectSettings(projectRoot),
    {
      model: hasCred ? credModel : DEFAULT_MODEL,
      baseURL: hasCred ? credBaseURL : DEFAULT_BASE_URL,
    },
    process.env
  );

  return {
    ...base,
    // Hard-override with credential values when active — credential login
    // is an explicit user choice and must take priority over all other sources.
    apiKey: hasCred ? credApiKey : base.apiKey,
    baseURL: hasCred ? credBaseURL : base.baseURL,
    model: hasCred ? credModel : base.model,
    thinkingEnabled: hasCred && credThinkingEnabled !== undefined ? credThinkingEnabled : base.thinkingEnabled,
    reasoningEffort: (hasCred && credReasoningEffort !== undefined
      ? credReasoningEffort
      : base.reasoningEffort) as ReasoningEffort,
  };
}
export { createOpenAIClient } from "../../common/openai-client";
