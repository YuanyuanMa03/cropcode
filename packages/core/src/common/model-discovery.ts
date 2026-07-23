/**
 * Dynamic model discovery via OpenAI-compatible GET /models endpoint.
 *
 * All four built-in providers (DeepSeek, Zhipu, Qwen, MiMo) support the
 * OpenAI-compatible `GET /v1/models` (or `GET /models`) endpoint that returns
 * the list of model IDs currently callable with the user's API key.
 *
 * This lets us discover newly-released models at runtime instead of waiting
 * for a provider-presets.ts update. The hardcoded presets remain the source
 * of truth for *metadata* (pricing, context window, thinking format) — models
 * returned by /models but absent from presets are surfaced as "unknown" entries
 * so the user can still select and try them.
 */

import OpenAI from "openai";
import { Agent, fetch as undiciFetch } from "undici";
import { BUILTIN_PROVIDERS, findProviderById, type ProviderModel } from "./provider-presets";
import { getActiveApiKey, getActiveBaseURL, getActiveCredential } from "./providers";

const keepAliveAgent = new Agent({ keepAliveTimeout: 30_000 });

export type DiscoveredModel = {
  id: string;
  /** Metadata from provider-presets if the model is known, otherwise minimal defaults. */
  preset?: ProviderModel;
  /** True when the model ID was returned by /models but not in our hardcoded presets. */
  unknown: boolean;
};

/**
 * Fetch the list of model IDs available for the given provider (or the active
 * provider when omitted) by calling its GET /models endpoint.
 *
 * Returns an empty array on any error (network, auth, unsupported) so callers
 * can fall back to the hardcoded preset list.
 */
export async function fetchAvailableModels(providerId?: string): Promise<string[]> {
  const cred = getActiveCredential();
  const pid = providerId ?? cred?.providerId;
  if (!pid) return [];

  const provider = findProviderById(pid);
  if (!provider) return [];

  const apiKey = pid === cred?.providerId ? getActiveApiKey() : undefined;
  if (!apiKey) return [];

  // Use the provider's standard API baseURL (not the coding-plan one).
  const baseURL = pid === cred?.providerId ? getActiveBaseURL() : provider.baseURL;

  try {
    const client = new OpenAI({
      apiKey,
      baseURL,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetch: (url: any, init: any) => undiciFetch(url, { ...init, dispatcher: keepAliveAgent }),
      // Short timeout — model discovery is best-effort.
      timeout: 10_000,
      maxRetries: 1,
    });
    const list = await client.models.list();
    return list.data
      .map((m) => m.id)
      .filter(Boolean)
      .sort();
  } catch {
    // Auth failure, network error, or provider doesn't support /models.
    return [];
  }
}

/**
 * Merge hardcoded preset models with dynamically-discovered model IDs.
 *
 * - Known models (in presets) keep their full metadata and original order.
 * - Newly-discovered models (in /models but not in presets) are appended with
 *   minimal defaults so the user can still select them.
 * - Preset models NOT returned by /models are kept (the endpoint may be
 *   incomplete — e.g. Alibaba docs warn about this), but marked with a flag.
 */
export function mergeDiscoveredModels(providerId: string, discoveredIds: string[]): DiscoveredModel[] {
  const provider = findProviderById(providerId);
  if (!provider) return [];

  const result: DiscoveredModel[] = [];
  const seen = new Set<string>();

  // 1. Known preset models first (preserve curated order, full metadata).
  for (const preset of provider.models) {
    seen.add(preset.id);
    result.push({ id: preset.id, preset, unknown: false });
  }

  // 2. Append newly-discovered models not in presets.
  for (const id of discoveredIds) {
    if (seen.has(id)) continue;
    // Skip obvious non-chat models (embeddings, TTS, ASR, vision-only, rerank).
    const lower = id.toLowerCase();
    if (
      lower.includes("embedding") ||
      lower.includes("tts") ||
      lower.includes("asr") ||
      lower.includes("speech") ||
      lower.includes("rerank") ||
      lower.includes("vision") ||
      lower.includes("-vl") ||
      lower.includes("omni")
    ) {
      continue;
    }
    seen.add(id);
    result.push({ id, unknown: true });
  }

  return result;
}

/** Convenience: fetch + merge in one call for the active (or specified) provider. */
export async function discoverModels(providerId?: string): Promise<DiscoveredModel[]> {
  const pid = providerId ?? getActiveCredential()?.providerId;
  if (!pid) {
    // No active credential — return all preset models as-is.
    const provider = BUILTIN_PROVIDERS.find((p) => p.id === providerId);
    return (provider?.models ?? []).map((preset) => ({ id: preset.id, preset, unknown: false }));
  }
  const discoveredIds = await fetchAvailableModels(pid);
  return mergeDiscoveredModels(pid, discoveredIds);
}
