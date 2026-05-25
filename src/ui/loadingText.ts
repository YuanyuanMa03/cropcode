import type { LlmStreamProgress, SessionEntry } from "../session";

type RunningProcesses = SessionEntry["processes"];

export type LoadingTextInput = {
  progress: LlmStreamProgress | null;
  processes?: RunningProcesses;
  now: number;
};

const STALL_THRESHOLD_MS = 3000;

const AGRICULTURAL_LOADING_MESSAGES = [
  "🌱 Germinating ideas...",
  "🌾 Harvesting insights...",
  "🌿 Growing solution...",
  "🧪 Analyzing data...",
  "📊 Computing results...",
  "🔍 Inspecting crops...",
  "🌡️ Checking conditions...",
  "💧 Irrigating knowledge...",
];

function getRandomLoadingMessage(): string {
  return AGRICULTURAL_LOADING_MESSAGES[Math.floor(Math.random() * AGRICULTURAL_LOADING_MESSAGES.length)];
}

export function buildLoadingText(input: LoadingTextInput): string {
  const { progress, processes, now } = input;
  const processText = buildProcessLoadingText(processes, now);
  if (processText) {
    return processText;
  }

  if (!progress) {
    return getRandomLoadingMessage();
  }

  const startedAt = parseTimestamp(progress.startedAt);
  if (startedAt === null) {
    return getRandomLoadingMessage();
  }

  const elapsedMs = Math.max(0, now - startedAt);
  if (elapsedMs < STALL_THRESHOLD_MS) {
    return getRandomLoadingMessage();
  }

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const tokens = progress.formattedTokens || "0";
  return `${getRandomLoadingMessage()} (${elapsedSeconds}s) · ↓ ${tokens} tokens`;
}

function buildProcessLoadingText(processes: RunningProcesses | undefined, now: number): string | null {
  if (!processes || processes.size === 0) {
    return null;
  }

  const first = processes.values().next().value as { startTime: string; command: string } | undefined;
  if (!first) {
    return null;
  }

  return `⚙️ (${formatElapsedTime(first.startTime, now)}) ${first.command}`;
}

function formatElapsedTime(startTimeIso: string, now: number): string {
  const startTime = parseTimestamp(startTimeIso);
  const elapsedMs = startTime === null ? 0 : Math.max(0, now - startTime);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  }
  return `${seconds}s`;
}

function parseTimestamp(value: string): number | null {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}
