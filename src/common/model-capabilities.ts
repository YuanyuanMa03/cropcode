import { BUILTIN_PROVIDERS, findModelInProvider, type ProviderModel, type ThinkingFormat } from "./provider-presets";
import { getActiveCredential } from "./providers";

function findModel(modelId: string): ProviderModel | undefined {
  const cred = getActiveCredential();
  if (cred) {
    const match = findModelInProvider(cred.providerId, modelId);
    if (match) return match;
  }
  for (const provider of BUILTIN_PROVIDERS) {
    const match = provider.models.find((m) => m.id === modelId);
    if (match) return match;
  }
  return undefined;
}

export function supportsThinking(model: string): boolean {
  const m = findModel(model);
  return m?.supportsThinking ?? false;
}

export function getThinkingFormat(model: string): ThinkingFormat | undefined {
  const m = findModel(model);
  return m?.thinkingFormat;
}

export function defaultsToThinkingMode(model: string): boolean {
  return supportsThinking(model);
}

export function supportsReasoningEffort(model: string): boolean {
  const m = findModel(model);
  return (m?.reasoningEfforts?.length ?? 0) > 0;
}

export function supportsMultimodal(model: string): boolean {
  const m = findModel(model);
  return m?.multimodal ?? false;
}

function parseContextWindow(value: string): number {
  const upper = value.trim().toUpperCase();
  if (upper.endsWith("M")) {
    return parseFloat(upper) * 1024 * 1024;
  }
  if (upper.endsWith("K")) {
    return parseFloat(upper) * 1024;
  }
  return parseInt(upper, 10) || 0;
}

const DEFAULT_COMPACT_THRESHOLD = 128 * 1024;

export function getCompactPromptTokenThreshold(model: string): number {
  const m = findModel(model);
  if (!m) {
    return DEFAULT_COMPACT_THRESHOLD;
  }
  const contextTokens = parseContextWindow(m.contextWindow);
  if (contextTokens <= 0) {
    return DEFAULT_COMPACT_THRESHOLD;
  }
  return Math.floor(contextTokens * 0.4);
}
