import chalk from "chalk";
import { renderMessageToStdout } from "../components/MessageView/utils";
import type { RawMode } from "../contexts";
import type { ModelConfigSelection } from "../../settings";
import type { SessionEntry, SessionMessage } from "../../session";
import type { SessionManager } from "../../session";

export function renderRawModeMessages(allMessages: SessionMessage[], mode: RawMode): void {
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
}

export function buildSyntheticUserMessage(content: string, imageCount: number): SessionMessage {
  const now = new Date().toISOString();
  return {
    id: `local-${crypto.randomUUID()}`,
    sessionId: "local",
    role: "user",
    content,
    contentParams:
      imageCount > 0
        ? Array.from({ length: imageCount }, () => ({
            type: "image_url",
            image_url: { url: "" },
          }))
        : null,
    messageParams: null,
    compacted: false,
    visible: true,
    createTime: now,
    updateTime: now,
  };
}

export function extractImageUrlsFromContentParams(contentParams: unknown): string[] {
  const params = Array.isArray(contentParams) ? contentParams : contentParams ? [contentParams] : [];
  const imageUrls: string[] = [];
  for (const param of params) {
    if (!param || typeof param !== "object") {
      continue;
    }
    const record = param as { type?: unknown; image_url?: { url?: unknown } };
    const url = record.image_url?.url;
    if (record.type === "image_url" && typeof url === "string" && url) {
      imageUrls.push(url);
    }
  }
  return imageUrls;
}

export function isCurrentSessionEmpty(sessionManager: SessionManager): boolean {
  const activeSessionId = sessionManager.getActiveSessionId();
  return !activeSessionId || !sessionManager.getSession(activeSessionId);
}

export function buildStatusLine(entry: SessionEntry): string {
  const parts: string[] = [];
  const statusMap: Record<string, string> = {
    pending: "就绪",
    processing: "运行中",
    waiting_for_user: "等待输入",
    completed: "已完成",
    interrupted: "已中断",
    failed: "失败",
    ask_permission: "请求权限",
    permission_denied: "权限拒绝",
  };
  parts.push(statusMap[entry.status] ?? entry.status);
  if (typeof entry.activeTokens === "number" && entry.activeTokens > 0) {
    parts.push(`${formatTokenCount(entry.activeTokens)} tokens`);
  }
  if (entry.failReason) {
    parts.push(`原因: ${entry.failReason}`);
  }
  return parts.join(" · ");
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

export function formatThinkingMode(
  settings: Pick<ModelConfigSelection, "thinkingEnabled" | "reasoningEffort">
): string {
  if (!settings.thinkingEnabled) {
    return "关闭";
  }
  const effortMap: Record<string, string> = {
    low: "低",
    medium: "中",
    high: "高",
    max: "最强",
  };
  return `深度思考 · ${effortMap[settings.reasoningEffort] ?? settings.reasoningEffort}`;
}

export function formatModelConfig(settings: ModelConfigSelection): string {
  return `${settings.model}, ${formatThinkingMode(settings)}`;
}
