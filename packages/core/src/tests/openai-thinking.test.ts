import { test } from "node:test";
import assert from "node:assert/strict";
import { buildThinkingRequestOptions } from "../common/openai-thinking";

test("buildThinkingRequestOptions returns empty for disabled thinking", () => {
  assert.deepEqual(buildThinkingRequestOptions(false, "deepseek-v4-pro"), {});
});

test("buildThinkingRequest returns empty for unknown model", () => {
  assert.deepEqual(buildThinkingRequestOptions(true, "some-unknown-model"), {});
});

test("buildThinkingRequestOptions returns empty for unknown model", () => {
  assert.deepEqual(buildThinkingRequestOptions(true, "some-unknown-model"), {});
});

test("buildThinkingRequestOptions enables deepseek thinking with default effort", () => {
  assert.deepEqual(buildThinkingRequestOptions(true, "deepseek-v4-pro"), {
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  });
});

test("buildThinkingRequestOptions enables deepseek thinking with high effort", () => {
  assert.deepEqual(buildThinkingRequestOptions(true, "deepseek-v4-flash", "high"), {
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  });
});

test("buildThinkingRequestOptions enables GLM thinking (same format as deepseek)", () => {
  assert.deepEqual(buildThinkingRequestOptions(true, "glm-5.1"), {
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  });
});

test("buildThinkingRequestOptions enables qwen thinking with budget", () => {
  assert.deepEqual(buildThinkingRequestOptions(true, "qwen3-max"), {
    enable_thinking: true,
    thinking_budget: 16384,
  });
});

test("buildThinkingRequestOptions enables qwen thinking with high effort", () => {
  assert.deepEqual(buildThinkingRequestOptions(true, "qwen3.7-plus", "high"), {
    enable_thinking: true,
    thinking_budget: 16384,
  });
});
