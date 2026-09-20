import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOpenAIConnection } from "../common/openai-client";

test("resolveOpenAIConnection prefers regular credentials", () => {
  const resolved = resolveOpenAIConnection({ apiKey: "sk-regular-test", baseURL: "https://configured.example.com" });

  assert.deepEqual(resolved, {
    apiKey: "sk-regular-test",
    baseURL: "https://configured.example.com",
  });
});

test("resolveOpenAIConnection preserves the configured base URL without credentials", () => {
  const resolved = resolveOpenAIConnection({ baseURL: "https://configured.example.com" });

  assert.deepEqual(resolved, {
    apiKey: undefined,
    baseURL: "https://configured.example.com",
  });
});
