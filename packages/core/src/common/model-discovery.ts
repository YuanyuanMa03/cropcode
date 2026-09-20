import OpenAI from "openai";
import { findProviderByBaseURL, findProviderById, type ProviderModel } from "./provider-presets";
import { resolveCurrentSettings } from "../settings";

export type DiscoveredModel = { id: string; preset?: ProviderModel; unknown: boolean };

export function mergeDiscoveredModels(providerId: string, ids: string[]): DiscoveredModel[] {
  const result: DiscoveredModel[] = (findProviderById(providerId)?.models ?? []).map((preset) => ({
    id: preset.id,
    preset,
    unknown: false,
  }));
  const seen = new Set(result.map((model) => model.id));
  for (const id of ids) {
    if (!id || seen.has(id) || /embedding|rerank|tts|asr|speech/i.test(id)) continue;
    seen.add(id);
    result.push({ id, unknown: true });
  }
  return result;
}

/** Discovery is optional; unsupported or unavailable endpoints retain preset/current models. */
export async function discoverModels(settings = resolveCurrentSettings()): Promise<DiscoveredModel[]> {
  const provider = findProviderByBaseURL(settings.baseURL);
  let ids: string[] = [];
  if (settings.apiKey) {
    try {
      const client = new OpenAI({ apiKey: settings.apiKey, baseURL: settings.baseURL, timeout: 5000, maxRetries: 0 });
      ids = (await client.models.list()).data.map((model) => model.id);
    } catch {
      /* Discovery is best-effort. */
    }
  }
  if (!ids.includes(settings.model)) ids.unshift(settings.model);
  return mergeDiscoveredModels(provider?.id ?? "", ids);
}
