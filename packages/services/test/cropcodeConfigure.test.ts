import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { configureProvider } from "../../../apps/zcode-cli/packages/cli/src/configure-command.js";
import { NodePersonalProviderConfigRepository } from "@zcode/provider-node";

test("CLI configuration persists a neutral provider and selection readable by a fresh host", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cropcode-provider-"));
  const file = join(dir, "provider.json");
  const env = {
    ZCODE_BUILTIN_PROVIDER_CONFIG_FILE: resolve("config/provider/zcode-builtin.json"),
    ZCODE_PERSONAL_PROVIDER_CONFIG_FILE: file,
    FIXTURE_KEY: "test-key-never-a-real-secret",
  };
  try {
    const selection = await configureProvider(
      {
        providerName: "Research endpoint",
        baseUrl: "https://model.example/v1",
        apiFormat: "openai-chat-completions",
        modelId: "research-model",
        apiKeyEnv: "FIXTURE_KEY",
        contextWindow: "65536",
      },
      env,
    );
    const repository = new NodePersonalProviderConfigRepository({
      filePath: file,
      pollingIntervalMs: false,
    });
    try {
      const fresh = await repository.read();
      assert.deepEqual(fresh.defaultModelSelection, selection);
      assert.equal(fresh.providers.toJSON().length, 1);
      assert.equal((await stat(file)).mode & 0o777, 0o600);
      const before = await readFile(file, "utf8");
      await assert.rejects(
        configureProvider(
          {
            providerName: "Invalid",
            baseUrl: "https://model.example",
            apiFormat: "unsupported",
            modelId: "bad",
            apiKeyEnv: "FIXTURE_KEY",
          },
          env,
        ),
      );
      assert.equal(await readFile(file, "utf8"), before);
    } finally {
      repository.dispose();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("configuration refuses missing credentials and credentials embedded in URLs", async () => {
  const env = {
    ZCODE_BUILTIN_PROVIDER_CONFIG_FILE: "unused",
    ZCODE_PERSONAL_PROVIDER_CONFIG_FILE: "unused",
  };
  const options = {
    providerName: "Test",
    baseUrl: "https://model.example",
    apiFormat: "openai-responses",
    modelId: "test",
  };
  await assert.rejects(configureProvider(options, env), /API Key/);
  await assert.rejects(
    configureProvider({ ...options, baseUrl: "https://user:password@model.example" }, env),
    /凭证/,
  );
});
