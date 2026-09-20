import type { ReasoningEffort } from "../settings";
import { findProviderByBaseURL } from "./provider-presets";

export function getReasoningEfforts(model: string, baseURL: string): ReasoningEffort[] {
  const provider = findProviderByBaseURL(baseURL)?.id;
  if (provider === "mimo" || provider === "longcat") return [];
  if (provider === "zhipu") return /^glm-5\.[23]/i.test(model) ? ["max", "high"] : [];
  return ["max", "high", "low"];
}

export function buildThinkingRequestOptions(
  thinkingEnabled: boolean,
  baseURL: string = "",
  reasoningEffort: ReasoningEffort = "max",
  model: string = ""
): Record<string, unknown> {
  const provider = findProviderByBaseURL(baseURL)?.id;
  if (provider === "qwen") {
    return {
      enable_thinking: thinkingEnabled,
      ...(thinkingEnabled ? { thinking_budget: { low: 4096, high: 16384, max: 32768 }[reasoningEffort] } : {}),
    };
  }
  const thinking = { type: thinkingEnabled ? "enabled" : "disabled" };
  if (provider === "mimo" || provider === "longcat") return { thinking };
  if (provider === "zhipu") {
    const supportsEffort = /^glm-5\.[23]/i.test(model);
    return {
      thinking,
      ...(thinkingEnabled && supportsEffort
        ? { reasoning_effort: reasoningEffort === "low" ? "high" : reasoningEffort }
        : {}),
    };
  }
  // The JavaScript SDK sends body fields verbatim; extra_body is a Python SDK convention.
  return { thinking, ...(thinkingEnabled ? { reasoning_effort: reasoningEffort } : {}) };
}
