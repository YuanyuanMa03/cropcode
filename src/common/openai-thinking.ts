import type { ReasoningEffort } from "../settings";
import {
  getThinkingFormat,
  supportsThinking as modelSupportsThinking,
  supportsReasoningEffort,
} from "./model-capabilities";

type ThinkingRequestOptions = Record<string, unknown>;

function effortToBudget(effort: string): number {
  switch (effort) {
    case "max":
      return 32768;
    case "high":
      return 16384;
    case "medium":
      return 8192;
    case "low":
      return 4096;
    default:
      return 16384;
  }
}

export function buildThinkingRequestOptions(
  thinkingEnabled: boolean,
  model: string = "",
  reasoningEffort: string = "max"
): ThinkingRequestOptions {
  if (!thinkingEnabled || !modelSupportsThinking(model)) {
    return {};
  }

  const format = getThinkingFormat(model);

  switch (format) {
    case "deepseek": {
      // DeepSeek, GLM, and MiMo support reasoning_effort.
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
