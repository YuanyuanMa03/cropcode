// Provider protocol sources and verification date: docs/providers.md.
export type ProviderModel = {
  id: string;
  label: string;
  multimodal?: boolean;
  supportsThinking?: boolean;
  defaultThinking?: boolean;
};
export type ProviderPreset = {
  id: string;
  label: string;
  description: string;
  icon: string;
  baseURL: string;
  apiKeyPage: string;
  keyFormat: string;
  freeTier: string;
  codingPlan?: { baseURL: string; keyFormat: string };
  models: ProviderModel[];
};
export const BUILTIN_PROVIDERS: ProviderPreset[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "DeepSeek API",
    icon: "🔥",
    baseURL: "https://api.deepseek.com",
    apiKeyPage: "https://platform.deepseek.com/api_keys",
    models: [
      {
        id: "deepseek-flash",
        label: "DeepSeek Flash",
        multimodal: true,
        supportsThinking: true,
        defaultThinking: true,
      },
      {
        id: "deepseek-v4-pro",
        label: "DeepSeek V4 Pro",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
      {
        id: "deepseek-v4-flash",
        label: "DeepSeek V4 Flash",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
      {
        id: "deepseek-v4-flash-vision-exp",
        label: "DeepSeek V4 Flash Vision",
        multimodal: true,
        supportsThinking: true,
        defaultThinking: true,
      },
    ],
    keyFormat: "API Key",
    freeTier: "额度、价格和可用模型以供应商控制台为准",
  },
  {
    id: "zhipu",
    label: "智谱 GLM",
    description: "API / Coding Plan",
    icon: "🧠",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyPage: "https://open.bigmodel.cn/user/apiKeys",
    codingPlan: {
      baseURL: "https://open.bigmodel.cn/api/coding/paas/v4",
      keyFormat: "API Key",
    },
    models: [
      {
        id: "glm-5.2",
        label: "GLM-5.2",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
      {
        id: "glm-5.1",
        label: "GLM-5.1",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
      {
        id: "glm-4.7",
        label: "GLM-4.7",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
      {
        id: "glm-4.7-flash",
        label: "GLM-4.7 Flash",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
    ],
    keyFormat: "API Key",
    freeTier: "额度、价格和可用模型以供应商控制台为准",
  },
  {
    id: "qwen",
    label: "通义千问",
    description: "阿里云百炼 API / Coding Plan",
    icon: "☁️",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyPage: "https://bailian.console.aliyun.com",
    codingPlan: {
      baseURL: "https://coding.dashscope.aliyuncs.com/v1",
      keyFormat: "sk-sp-...",
    },
    models: [
      {
        id: "qwen3.7-plus",
        label: "Qwen3.7 Plus",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
      {
        id: "qwen3.7-max",
        label: "Qwen3.7 Max",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
    ],
    keyFormat: "API Key",
    freeTier: "额度、价格和可用模型以供应商控制台为准",
  },
  {
    id: "mimo",
    label: "MiMo 小米",
    description: "API / Token Plan",
    icon: "📱",
    baseURL: "https://api.xiaomimimo.com/v1",
    apiKeyPage: "https://platform.xiaomimimo.com/api-keys",
    codingPlan: {
      baseURL: "https://token-plan-cn.xiaomimimo.com/v1",
      keyFormat: "Token Plan API Key",
    },
    models: [
      {
        id: "mimo-v2.5-pro",
        label: "MiMo V2.5 Pro",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
      {
        id: "mimo-v2.5",
        label: "MiMo V2.5",
        multimodal: true,
        supportsThinking: true,
        defaultThinking: true,
      },
    ],
    keyFormat: "API Key",
    freeTier: "额度、价格和可用模型以供应商控制台为准",
  },
  {
    id: "longcat",
    label: "LongCat",
    description: "美团 LongCat API",
    icon: "🐱",
    baseURL: "https://api.longcat.chat/openai/v1",
    apiKeyPage: "https://longcat.chat/platform/api_keys",
    models: [
      {
        id: "LongCat-2.0",
        label: "LongCat 2.0",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
      },
    ],
    keyFormat: "API Key",
    freeTier: "额度、价格和可用模型以供应商控制台为准",
  },
];
export function findProviderById(id: string): ProviderPreset | undefined {
  return BUILTIN_PROVIDERS.find((provider) => provider.id === id);
}
export function findModelInProvider(providerId: string, modelId: string): ProviderModel | undefined {
  return findProviderById(providerId)?.models.find((model) => model.id === modelId);
}
export function findProviderByBaseURL(baseURL: string): ProviderPreset | undefined {
  const normalized = baseURL.replace(/\/+$/, "");
  return BUILTIN_PROVIDERS.find((provider) =>
    [provider.baseURL, provider.codingPlan?.baseURL].some((url) => url === normalized)
  );
}
export function resolveProviderBaseURL(providerId: string, mode: "api" | "coding-plan"): string {
  const provider = findProviderById(providerId);
  return (mode === "coding-plan" ? provider?.codingPlan?.baseURL : undefined) ?? provider?.baseURL ?? "";
}
