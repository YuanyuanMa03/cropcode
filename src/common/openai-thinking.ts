import type { ReasoningEffort } from "../settings";
import {
  getThinkingFormat,
  supportsThinking as modelSupportsThinking,
  supportsReasoningEffort,
} from "./model-capabilities";

type ThinkingRequestOptions = Record<string, unknown>;

function effortToBudget(effort: ReasoningEffort): number {
  return effort === "max" ? 32768 : 16384;
}

export function buildThinkingRequestOptions(
  thinkingEnabled: boolean,
  model: string = "",
  reasoningEffort: ReasoningEffort = "max"
): ThinkingRequestOptions {
  if (!thinkingEnabled || !modelSupportsThinking(model)) {
    return {};
  }

  const format = getThinkingFormat(model);

  switch (format) {
    case "deepseek": {
      // DeepSeek and GLM support reasoning_effort; MiMo does not.
      const opts: ThinkingRequestOptions = { thinking: { type: "enabled" } };
      if (supportsReasoningEffort(model)) {
        opts.extra_body = { reasoning_effort: reasoningEffort };
      }
      return opts;
    }
    case "qwen":
      return {
        enable_thinking: true,
        thinking_budget: effortToBudget(reasoningEffort),
      };
    default:
      return {};
  }
}
