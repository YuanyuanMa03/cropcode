import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import os from "node:os";
import * as path from "node:path";
import { syncBuiltinESMExports } from "node:module";
import OpenAI from "openai";
import {
  activateProvider,
  readSettings,
  resolveCurrentSettings,
  writeSettings,
  writeProjectSettings,
  writeModelConfigSelection,
} from "../settings";
import { readCredentials } from "../common/providers";
import { BUILTIN_PROVIDERS, resolveProviderBaseURL } from "../common/provider-presets";
import { buildThinkingRequestOptions } from "../common/openai-thinking";
import { mergeDiscoveredModels } from "../common/model-discovery";
import { supportsMultimodal } from "../common/model-capabilities";

test("switching providers keeps model, endpoint and key together; explicit overrides retain precedence", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cropcode-provider-test-"));
  t.mock.method(os, "homedir", () => dir);
  syncBuiltinESMExports();
  const previous = new Map(Object.entries(process.env).filter(([key]) => key.startsWith("CROPCODE_")));
  for (const key of previous.keys()) delete process.env[key];
  t.after(() => {
    for (const key of Object.keys(process.env)) if (key.startsWith("CROPCODE_")) delete process.env[key];
    for (const [key, value] of previous) process.env[key] = value;
    t.mock.restoreAll();
    syncBuiltinESMExports();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const project = path.join(dir, "project");
  writeSettings({ enabledSkills: { example: false }, env: { MODEL: "old-model", API_KEY: "fixture-old" } });
  for (const provider of BUILTIN_PROVIDERS) {
    for (const mode of provider.codingPlan ? (["api", "coding-plan"] as const) : (["api"] as const)) {
      const model = provider.models[0].id;
      const apiKey = `fixture-${provider.id}-${mode}`;
      activateProvider({
        providerId: provider.id,
        mode,
        apiKey,
        activeModel: model,
        thinkingEnabled: true,
        reasoningEffort: "high",
      });
      const settings = resolveCurrentSettings(project);
      assert.equal(settings.apiKey, apiKey);
      assert.equal(settings.model, model);
      assert.equal(settings.baseURL, resolveProviderBaseURL(provider.id, mode));
      assert.equal(settings.enabledSkills.example, false);
      assert.equal(readCredentials()?.activeProvider, provider.id);
    }
  }
  writeModelConfigSelection(
    { model: "custom-model", thinkingEnabled: false, reasoningEffort: "high" },
    resolveCurrentSettings(project),
    project
  );
  assert.equal(resolveCurrentSettings(project).model, "custom-model");
  assert.equal(resolveCurrentSettings(project).thinkingEnabled, false);
  writeProjectSettings({ model: "project-model" }, project);
  assert.equal(resolveCurrentSettings(project).model, "project-model");
  process.env.CROPCODE_MODEL = "environment-model";
  assert.equal(resolveCurrentSettings(project).model, "environment-model");
  assert.equal(readSettings()?.enabledSkills?.example, false);
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(path.join(dir, ".cropcode", "credentials.json")).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.join(dir, ".cropcode", "settings.json")).mode & 0o777, 0o600);
  }
});

test("provider adapters serialize the correct HTTP body through the actual OpenAI SDK", async () => {
  const cases = [
    ["deepseek", "deepseek-flash", { thinking: { type: "enabled" }, reasoning_effort: "max" }],
    ["zhipu", "glm-5.2", { thinking: { type: "enabled" }, reasoning_effort: "max" }],
    ["zhipu", "glm-4.7", { thinking: { type: "enabled" } }],
    ["qwen", "qwen3.7-plus", { enable_thinking: true, thinking_budget: 32768 }],
    ["mimo", "mimo-v2.5", { thinking: { type: "enabled" } }],
    ["longcat", "LongCat-2.0", { thinking: { type: "enabled" } }],
  ] as const;
  for (const [providerId, model, expected] of cases) {
    const baseURL = resolveProviderBaseURL(providerId, "api");
    let requests = 0;
    const client = new OpenAI({
      apiKey: "fixture-key",
      baseURL,
      maxRetries: 0,
      fetch: async (url, init) => {
        requests++;
        assert.equal(String(url), `${baseURL}/chat/completions`);
        const body = JSON.parse(String(init?.body));
        const { model: requestedModel, messages: _messages, ...options } = body;
        assert.equal(requestedModel, model);
        assert.deepEqual(options, expected);
        return new Response(
          JSON.stringify({ id: "fixture", object: "chat.completion", created: 0, model, choices: [] }),
          { headers: { "content-type": "application/json" } }
        );
      },
    });
    await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "test" }],
      ...buildThinkingRequestOptions(true, baseURL, "max", model),
    });
    assert.equal(requests, 1);
    const disabled = buildThinkingRequestOptions(false, baseURL, "max", model);
    assert.deepEqual(disabled, providerId === "qwen" ? { enable_thinking: false } : { thinking: { type: "disabled" } });
  }
});

test("model discovery preserves new chat/vision models and filters non-chat endpoints", () => {
  const models = mergeDiscoveredModels("mimo", [
    "mimo-v2.5",
    "new-vision-model",
    "new-chat-model",
    "new-chat-model",
    "text-embedding",
  ]);
  assert.equal(models.filter((model) => model.id === "mimo-v2.5").length, 1);
  assert.equal(models.filter((model) => model.id === "new-chat-model").length, 1);
  assert.ok(models.some((model) => model.id === "new-vision-model" && model.unknown));
  assert.ok(!models.some((model) => model.id === "text-embedding"));
  assert.equal(supportsMultimodal("mimo-v2.5"), true);
  assert.equal(supportsMultimodal("mimo-v2.5", "off"), false);
  assert.equal(supportsMultimodal("glm-5.2", "on"), true);
});
