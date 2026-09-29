import { ModelConfig, parseProviderConfig } from "@zcode/provider";
import { NodeProviderRegistryRuntime, resolveNodeProviderRuntimePaths } from "@zcode/provider-node";
import type { RunContext } from "@zcode/shared-types";

export interface ConfigureProviderOptions {
  providerName?: string;
  baseUrl?: string;
  apiFormat?: string;
  modelId?: string;
  apiKeyEnv?: string;
  contextWindow?: string;
}

/** Writes through the same provider configuration service used by the desktop. */
export async function configureProvider(options: ConfigureProviderOptions, env: NodeJS.ProcessEnv) {
  const paths = resolveNodeProviderRuntimePaths(env);
  if (!paths) throw new Error("模型配置路径未初始化。");
  const name = options.providerName?.trim();
  const modelId = options.modelId?.trim();
  const baseUrl = options.baseUrl?.trim();
  if (!name || !modelId || !baseUrl || !options.apiFormat) {
    throw new Error("请指定 --provider-name、--base-url、--api-format 和 --model-id。");
  }
  const url = new URL(baseUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("模型端点必须是 HTTP(S) 地址，且不能在 URL 中包含凭证。");
  }
  const apiKey = options.apiKeyEnv ? env[options.apiKeyEnv] : undefined;
  if (options.apiKeyEnv && !apiKey?.trim()) throw new Error("指定的 API Key 环境变量为空。");
  if (!apiKey && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("请通过 --api-key-env 指定保存 API Key 的环境变量名称。");
  }
  const contextWindow = options.contextWindow ? Number(options.contextWindow) : 32768;
  if (!Number.isSafeInteger(contextWindow) || contextWindow < 1024) {
    throw new Error("上下文窗口必须是至少 1024 的整数。");
  }
  const initialConfig = parseProviderConfig({
    api: { type: options.apiFormat, baseUrl },
    access: { type: "api-key", apiKey: apiKey ?? "local" },
  });
  const runtime = new NodeProviderRegistryRuntime({ ...paths, watch: false, personalPollingIntervalMs: false });
  let createdId: string | undefined;
  try {
    await runtime.start();
    const { providerId } = await runtime.configService.createPersonalProvider({ providerName: name, initialConfig });
    createdId = providerId;
    await runtime.configService.addPersonalModel(providerId, modelId, ModelConfig.fromData({
      enabled: true, properties: { contextWindow },
    }));
    await runtime.personalRepository.update((current) => ({
      ...current,
      defaultModelSelection: { providerId, modelId },
    }));
    return { providerId, modelId };
  } catch (error) {
    if (createdId) await runtime.configService.deletePersonalProvider(createdId);
    throw error;
  } finally {
    runtime.dispose();
  }
}

export async function runConfigureCommand(ctx: RunContext, options: ConfigureProviderOptions, env: NodeJS.ProcessEnv) {
  try {
    const result = await configureProvider(options, env);
    ctx.stdout.write(`已配置 ${result.providerId}/${result.modelId}。终端和桌面共用此模型配置。\n`);
    return 0;
  } catch (error) {
    ctx.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
