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
  if (!m) return true; // unknown custom model: assume multimodal (permissive default)
  return m.multimodal ?? false;
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

// --- Compaction thresholds (modeled after Claude Code) ---

const DEFAULT_CONTEXT_WINDOW = 128 * 1024;
const MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000;
const AUTOCOMPACT_BUFFER_TOKENS = 13_000;
const AUTOCOMPACT_BUFFER_400K = 30_000;
const AUTOCOMPACT_BUFFER_800K = 50_000;

// Microcompact: prune old tool results when count exceeds this
export const MICROCOMPACT_TRIGGER_THRESHOLD = 20;
export const MICROCOMPACT_KEEP_RECENT = 10;

// Circuit breaker: stop auto-compact after this many consecutive failures
export const MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3;

function getAutocompactBufferTokens(contextTokens: number): number {
  if (contextTokens >= 800_000) return AUTOCOMPACT_BUFFER_800K;
  if (contextTokens >= 400_000) return AUTOCOMPACT_BUFFER_400K;
  return AUTOCOMPACT_BUFFER_TOKENS;
}

export function getContextWindowForModel(model: string): number {
  const m = findModel(model);
  if (!m) return DEFAULT_CONTEXT_WINDOW;
  const contextTokens = parseContextWindow(m.contextWindow);
  return contextTokens > 0 ? contextTokens : DEFAULT_CONTEXT_WINDOW;
}

export function getEffectiveContextWindow(model: string): number {
  const contextWindow = getContextWindowForModel(model);
  return contextWindow - MAX_OUTPUT_TOKENS_FOR_SUMMARY;
}

export function getCompactPromptTokenThreshold(model: string): number {
  const effective = getEffectiveContextWindow(model);
  const buffer = getAutocompactBufferTokens(effective);
  return effective - buffer;
}

// --- max_tokens: output token limit per model ---

const DEFAULT_MAX_OUTPUT_TOKENS = 32_768;

const MAX_OUTPUT_BY_CONTEXT: Array<{ threshold: number; maxOutput: number }> = [
  { threshold: 800_000, maxOutput: 65_536 },
  { threshold: 200_000, maxOutput: 32_768 },
  { threshold: 100_000, maxOutput: 16_384 },
];

export function getMaxOutputTokens(model: string): number {
  const contextWindow = getContextWindowForModel(model);
  for (const { threshold, maxOutput } of MAX_OUTPUT_BY_CONTEXT) {
    if (contextWindow >= threshold) return maxOutput;
  }
  return DEFAULT_MAX_OUTPUT_TOKENS;
}
