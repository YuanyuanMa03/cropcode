/**
 * Domestic (China) LLM provider presets with real URLs, pricing, and token plan data.
 * All providers are OpenAI-compatible — just swap baseURL + apiKey.
 */

export type ThinkingFormat = "deepseek" | "qwen";

export type CodingPlanTier = {
  id: string;
  label: string;
  price: string;
  credits: string;
  description: string;
};

export type ProviderModel = {
  id: string;
  label: string;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
  cacheHitPricePerMTok?: number;
  contextWindow: string;
  multimodal?: boolean;
  free?: boolean;
  supportsThinking?: boolean;
  defaultThinking?: boolean;
  thinkingFormat?: ThinkingFormat;
  reasoningEfforts?: ("high" | "max")[];
  tags?: string[];
  deprecated?: string;
};

export type ProviderPreset = {
  id: string;
  label: string;
  description: string;
  icon: string;
  baseURL: string;
  website: string;
  apiKeyPage: string;
  pricingPage: string;
  topUpPage: string;
  freeTier: string;
  keyFormat: string;
  openaiCompatible: boolean;
  codingPlan?: {
    baseURL: string;
    keyFormat: string;
    purchasePage: string;
    tiers: CodingPlanTier[];
  };
  models: ProviderModel[];
};

export const BUILTIN_PROVIDERS: ProviderPreset[] = [
  // ── 1. DeepSeek ────────────────────────────────────────────
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "最便宜·代码最强·送500万tokens",
    icon: "🔥",
    baseURL: "https://api.deepseek.com",
    website: "https://platform.deepseek.com",
    apiKeyPage: "https://platform.deepseek.com/api_keys",
    pricingPage: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
    topUpPage: "https://platform.deepseek.com",
    freeTier: "注册送500万tokens（30天有效），充值¥10起",
    keyFormat: "sk-...",
    openaiCompatible: true,
    models: [
      {
        id: "deepseek-v4-pro",
        label: "DeepSeek V4 Pro",
        inputPricePerMTok: 3,
        outputPricePerMTok: 6,
        cacheHitPricePerMTok: 0.025,
        contextWindow: "1M",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "deepseek",
        reasoningEfforts: ["high", "max"],
        tags: ["推荐", "代码最强"],
      },
      {
        id: "deepseek-v4-flash",
        label: "DeepSeek V4 Flash",
        inputPricePerMTok: 1,
        outputPricePerMTok: 2,
        cacheHitPricePerMTok: 0.02,
        contextWindow: "1M",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "deepseek",
        reasoningEfforts: ["high", "max"],
        tags: ["轻量快速"],
      },
    ],
  },

  // ── 2. 智谱 GLM (Z.ai) ────────────────────────────────────
  {
    id: "zhipu",
    label: "智谱 GLM",
    description: "免费模型可用·Coding Plan·推理最强",
    icon: "🧠",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    website: "https://open.bigmodel.cn",
    apiKeyPage: "https://open.bigmodel.cn/user/apiKeys",
    pricingPage: "https://bigmodel.cn/pricing",
    topUpPage: "https://open.bigmodel.cn",
    freeTier: "GLM-4.7-Flash / GLM-Z1-Flash 永久免费，新用户送token配额",
    keyFormat: "{id}.{secret}",
    openaiCompatible: true,
    codingPlan: {
      baseURL: "https://open.bigmodel.cn/api/coding/paas/v4",
      keyFormat: "{id}.{secret}",
      purchasePage: "https://bigmodel.cn/claude-code",
      tiers: [
        {
          id: "lite",
          label: "Lite 套餐",
          price: "¥72/月 ($30/季)",
          credits: "~400 prompts/周",
          description: "支持 GLM-5.1/5-Turbo/4.7/4.5-Air，含 MCP 工具",
        },
        {
          id: "pro",
          label: "Pro 套餐",
          price: "¥216/月 ($90/季)",
          credits: "~2000 prompts/周",
          description: "Lite 全部 + GLM-5，5倍额度",
        },
        {
          id: "max",
          label: "Max 套餐",
          price: "¥576/月 ($240/季)",
          credits: "~8000 prompts/周",
          description: "4倍 Pro 额度，适合高频复杂项目",
        },
      ],
    },
    models: [
      {
        id: "glm-5.1",
        label: "GLM-5.1",
        inputPricePerMTok: 10.1,
        outputPricePerMTok: 31.7,
        contextWindow: "203K",
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "deepseek",
        reasoningEfforts: ["high", "max"],
        tags: ["旗舰"],
      },
      {
        id: "glm-4.7",
        label: "GLM-4.7",
        inputPricePerMTok: 4.3,
        outputPricePerMTok: 15.8,
        contextWindow: "205K",
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "deepseek",
        reasoningEfforts: ["high", "max"],
        tags: ["推荐"],
      },
      {
        id: "glm-4.6",
        label: "GLM-4.6",
        inputPricePerMTok: 4.3,
        outputPricePerMTok: 15.8,
        contextWindow: "205K",
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "deepseek",
        reasoningEfforts: ["high", "max"],
        tags: ["稳定"],
      },
      {
        id: "glm-4.7-flash",
        label: "GLM-4.7 Flash",
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: "203K",
        free: true,
        supportsThinking: true,
        thinkingFormat: "deepseek",
        reasoningEfforts: ["high", "max"],
        tags: ["永久免费"],
      },
    ],
  },

  // ── 3. 通义千问 (Qwen / 阿里云百炼) ──────────────────────
  {
    id: "qwen",
    label: "通义千问",
    description: "阿里云生态·Coding Plan·90天免费",
    icon: "☁️",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    website: "https://bailian.console.aliyun.com",
    apiKeyPage: "https://bailian.console.aliyun.com",
    pricingPage: "https://help.aliyun.com/zh/model-studio/model-pricing",
    topUpPage: "https://bailian.console.aliyun.com",
    freeTier: "开通后90天内各模型有免费额度",
    keyFormat: "sk-...",
    openaiCompatible: true,
    codingPlan: {
      baseURL: "https://coding.dashscope.aliyuncs.com/v1",
      keyFormat: "sk-sp-...",
      purchasePage: "https://bailian.console.aliyun.com",
      tiers: [
        {
          id: "pro",
          label: "Pro 套餐",
          price: "¥200/月",
          credits: "含千问/GLM/Kimi/MiniMax模型",
          description: "Lite已于2026/03停售，Pro为入门档位",
        },
      ],
    },
    models: [
      {
        id: "qwen3-max",
        multimodal: true,
        label: "Qwen3 Max",
        inputPricePerMTok: 2.5,
        outputPricePerMTok: 10,
        contextWindow: "262K",
        supportsThinking: true,
        thinkingFormat: "qwen",
        tags: ["旗舰"],
      },
      {
        id: "qwen3.5-plus",
        multimodal: true,
        label: "Qwen3.5 Plus",
        inputPricePerMTok: 0.8,
        outputPricePerMTok: 4.8,
        contextWindow: "1M",
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "qwen",
        tags: ["推荐", "性价比"],
      },
      {
        id: "qwen3.5-flash",
        multimodal: true,
        label: "Qwen3.5 Flash",
        inputPricePerMTok: 0.2,
        outputPricePerMTok: 2,
        contextWindow: "1M",
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "qwen",
        tags: ["轻量"],
      },
    ],
  },
  // ── 4. MiMo (小米) ──────────────────────────────────────────
  {
    id: "mimo",
    label: "MiMo 小米",
    description: "1M超长上下文·128K输出·Token Plan·开源",
    icon: "📱",
    baseURL: "https://api.xiaomimimo.com/v1",
    website: "https://platform.xiaomimimo.com",
    apiKeyPage: "https://platform.xiaomimimo.com/api-keys",
    pricingPage: "https://platform.xiaomimimo.com/docs/zh-CN/price/pay-as-you-go",
    topUpPage: "https://platform.xiaomimimo.com",
    freeTier: "新用户赠送额度，mimo-v2-flash 低成本可用",
    keyFormat: "sk-...",
    openaiCompatible: true,
    codingPlan: {
      baseURL: "https://token-plan-cn.xiaomimimo.com/v1",
      keyFormat: "tp-...",
      purchasePage: "https://platform.xiaomimimo.com/token-plan",
      tiers: [
        {
          id: "lite",
          label: "Lite 套餐",
          price: "¥39/月 ($6/月)",
          credits: "4.1B Credits/月",
          description: "适合轻度使用，支持全部 MiMo 模型",
        },
        {
          id: "standard",
          label: "Standard 套餐",
          price: "¥99/月 ($16/月)",
          credits: "11B Credits/月",
          description: "2.7倍 Lite 额度，适合日常编程",
        },
        {
          id: "pro",
          label: "Pro 套餐",
          price: "¥329/月 ($50/月)",
          credits: "38B Credits/月",
          description: "9倍 Lite 额度，适合高频复杂项目",
        },
        {
          id: "max",
          label: "Max 套餐",
          price: "¥659/月 ($100/月)",
          credits: "82B Credits/月",
          description: "20倍 Lite 额度，适合团队级使用",
        },
      ],
    },
    models: [
      {
        id: "mimo-v2.5-pro",
        label: "MiMo V2.5 Pro",
        inputPricePerMTok: 3,
        outputPricePerMTok: 6,
        cacheHitPricePerMTok: 0.025,
        contextWindow: "1M",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "deepseek",
        tags: ["推荐", "旗舰"],
      },
      {
        id: "mimo-v2.5",
        label: "MiMo V2.5",
        inputPricePerMTok: 1,
        outputPricePerMTok: 2,
        cacheHitPricePerMTok: 0.02,
        contextWindow: "1M",
        multimodal: true,
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "deepseek",
        tags: ["多模态"],
      },
      {
        id: "mimo-v2-flash",
        label: "MiMo V2 Flash",
        inputPricePerMTok: 0.7,
        outputPricePerMTok: 2.1,
        cacheHitPricePerMTok: 0.07,
        contextWindow: "256K",
        multimodal: false,
        supportsThinking: true,
        defaultThinking: true,
        thinkingFormat: "deepseek",
        tags: ["轻量"],
      },
    ],
  },
];

export function findProviderById(id: string): ProviderPreset | undefined {
  return BUILTIN_PROVIDERS.find((p) => p.id === id);
}

export function findModelInProvider(providerId: string, modelId: string): ProviderModel | undefined {
  const provider = findProviderById(providerId);
  return provider?.models.find((m) => m.id === modelId);
}

export function resolveProviderBaseURL(providerId: string, mode: "api" | "coding-plan"): string {
  const provider = findProviderById(providerId);
  if (!provider) return "";
  if (mode === "coding-plan" && provider.codingPlan) {
    return provider.codingPlan.baseURL;
  }
  return provider.baseURL;
}
