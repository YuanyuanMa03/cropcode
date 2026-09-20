import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import DropdownMenu from "./components/DropdownMenu";
import { BUILTIN_PROVIDERS, type ProviderPreset, type ProviderModel } from "@yuanyuanma03/cropcode-core";
import { activateProvider } from "@yuanyuanma03/cropcode-core";

type LoginStep = "provider" | "mode" | "model" | "apikey";
type AccessMode = "api" | "coding-plan";

type LoginScreenProps = {
  width: number;
  onComplete: () => void;
  onCancel?: () => void;
};

export function LoginScreen({ width, onComplete, onCancel }: LoginScreenProps): React.ReactElement {
  const [step, setStep] = useState<LoginStep>("provider");
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<ProviderPreset | null>(null);
  const [selectedMode, setSelectedMode] = useState<AccessMode>("api");
  const [selectedModel, setSelectedModel] = useState<ProviderModel | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { exit } = useApp();
  useInput((input, key) => {
    if (key.ctrl && (input === "c" || input === "d")) exit();
  });

  const provider = selectedProvider;
  const needsModeChoice = provider?.codingPlan != null;

  useEffect(() => {
    setActiveIndex(0);
    setError(null);
  }, [step]);

  const resetToProvider = useCallback(() => {
    setStep("provider");
    setActiveIndex(0);
    setSelectedProvider(null);
    setSelectedMode("api");
    setSelectedModel(null);
    setApiKey("");
    setError(null);
  }, []);

  // ── Step: Provider ──────────────────────────────────────
  useInput(
    (_input, key) => {
      if (step !== "provider") return;
      if (key.escape && onCancel) {
        onCancel();
        return;
      }

      if (key.upArrow) {
        setActiveIndex((i) => (i - 1 + BUILTIN_PROVIDERS.length) % BUILTIN_PROVIDERS.length);
        return;
      }
      if (key.downArrow) {
        setActiveIndex((i) => (i + 1) % BUILTIN_PROVIDERS.length);
        return;
      }
      if (key.return && !key.shift && !key.meta) {
        const p = BUILTIN_PROVIDERS[activeIndex];
        if (!p) return;
        setSelectedProvider(p);
        if (p.codingPlan) {
          setStep("mode");
        } else {
          setSelectedMode("api");
          setStep("model");
        }
        return;
      }
    },
    { isActive: step === "provider" }
  );

  // ── Step: Mode ──────────────────────────────────────────
  const modeOptions = [
    { id: "api" as AccessMode, label: "按量付费 (API)", desc: "自由充值，用多少扣多少" },
    {
      id: "coding-plan" as AccessMode,
      label: "编程套餐 (Coding Plan)",
      desc: "固定月费，高额用量",
    },
  ];

  useInput(
    (_input, key) => {
      if (step !== "mode") return;

      if (key.upArrow || key.downArrow) {
        setActiveIndex((i) => (i === 0 ? 1 : 0));
        return;
      }
      if (key.escape) {
        resetToProvider();
        return;
      }
      if (key.return && !key.shift && !key.meta) {
        setSelectedMode(modeOptions[activeIndex]?.id ?? "api");
        setStep("model");
        return;
      }
    },
    { isActive: step === "mode" }
  );

  // ── Step: Model ─────────────────────────────────────────
  const models = provider?.models ?? [];

  useInput(
    (_input, key) => {
      if (step !== "model") return;

      if (key.upArrow) {
        setActiveIndex((i) => (i - 1 + models.length) % models.length);
        return;
      }
      if (key.downArrow) {
        setActiveIndex((i) => (i + 1) % models.length);
        return;
      }
      if (key.escape) {
        if (needsModeChoice) {
          setStep("mode");
          setActiveIndex(0);
        } else {
          resetToProvider();
        }
        return;
      }
      if (key.return && !key.shift && !key.meta) {
        const m = models[activeIndex];
        if (!m) return;
        setSelectedModel(m);
        setStep("apikey");
        return;
      }
    },
    { isActive: step === "model" }
  );

  // ── Step: API Key ───────────────────────────────────────
  useInput(
    (_input, key) => {
      if (step !== "apikey") return;

      if (key.escape) {
        setStep("model");
        setActiveIndex(0);
        setApiKey("");
        setError(null);
        return;
      }
      if (key.return && !key.shift && !key.meta) {
        if (!apiKey.trim()) {
          setError("请输入 API Key");
          return;
        }
        if (!provider || !selectedModel) return;
        const thinkingEnabled = selectedModel.defaultThinking ?? false;
        try {
          activateProvider({
            providerId: provider.id,
            apiKey: apiKey.trim(),
            activeModel: selectedModel.id,
            mode: selectedMode,
            thinkingEnabled,
            reasoningEffort: "high",
          });
        } catch {
          setError("无法保存配置，请检查配置目录的写入权限。");
          return;
        }
        onComplete();
        return;
      }
      if (key.backspace || key.delete) {
        setApiKey((prev) => prev.slice(0, -1));
        setError(null);
        return;
      }
      if (_input && !key.ctrl && !key.meta) {
        setApiKey((prev) => prev + _input);
        setError(null);
      }
    },
    { isActive: step === "apikey" }
  );

  // ── Render ──────────────────────────────────────────────
  return (
    <Box flexDirection="column" marginY={1} width={Math.min(width, 72)}>
      <Box borderStyle="round" borderColor="#2d8a4e" flexDirection="column" paddingX={1}>
        <Text color="#2d8a4e" bold>
          🌾 欢迎使用 CropCode！
        </Text>
        <Text dimColor> 选择 AI 供应商开始使用（国内直连，无需代理）</Text>
      </Box>

      {step === "provider" ? renderProviderStep() : null}
      {step === "mode" ? renderModeStep() : null}
      {step === "model" ? renderModelStep() : null}
      {step === "apikey" ? renderApiKeyStep() : null}
    </Box>
  );

  // ── Sub-renders ─────────────────────────────────────────
  function renderProviderStep() {
    const items = BUILTIN_PROVIDERS.map((p, i) => ({
      key: p.id,
      label: `${p.icon} ${p.label}`,
      description: p.description,
      selected: i === activeIndex,
    }));

    return (
      <Box flexDirection="column" marginTop={1}>
        <DropdownMenu
          width={width}
          items={items}
          activeIndex={activeIndex}
          title="选择供应商"
          activeColor="#2d8a4e"
          helpText="↑↓ 选择 · Enter 确认"
          maxVisible={6}
        />
      </Box>
    );
  }

  function renderModeStep() {
    const items = modeOptions.map((opt, i) => ({
      key: opt.id,
      label: opt.label,
      description: opt.desc,
      selected: i === activeIndex,
    }));

    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="#2d8a4e" bold>
          {provider?.icon} {provider?.label} — 选择接入方式
        </Text>
        <DropdownMenu
          width={width}
          items={items}
          activeIndex={activeIndex}
          title="接入方式"
          activeColor="#2d8a4e"
          helpText="↑↓ 选择 · Enter 确认 · Esc 返回"
          maxVisible={4}
        />
        <Box marginTop={1}>
          <Text dimColor>💡 未购买套餐？选"按量付费"即可</Text>
        </Box>
      </Box>
    );
  }

  function renderModelStep() {
    const items = models.map((m, i) => {
      return {
        key: m.id,
        label: m.label,
        description: m.supportsThinking ? "支持思考模式" : "对话模型",
        selected: i === activeIndex,
      };
    });

    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="#2d8a4e" bold>
          {provider?.icon} {provider?.label} — 选择模型
        </Text>
        <DropdownMenu
          width={width}
          items={items}
          activeIndex={activeIndex}
          title="选择模型"
          activeColor="#2d8a4e"
          helpText="↑↓ 选择 · Enter 确认 · Esc 返回"
          maxVisible={6}
        />
      </Box>
    );
  }

  function renderApiKeyStep() {
    const maskedKey = "•".repeat(Math.min(apiKey.length, 28));

    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="#2d8a4e" bold>
          🔑 {provider?.label} API Key
        </Text>
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor> 获取方式：</Text>
          <Text dimColor> 1. 访问 {provider?.apiKeyPage}</Text>
          <Text dimColor> 2. {provider?.freeTier}</Text>
          <Text dimColor> 3. Key 格式: {provider?.keyFormat}</Text>
        </Box>
        <Box flexDirection="row" marginTop={1}>
          <Text color="#2d8a4e">{">"}_ </Text>
          <Text>{maskedKey}</Text>
          <Text color="gray">▎</Text>
        </Box>
        {error ? (
          <Box marginTop={1}>
            <Text color="red">⚠ {error}</Text>
          </Box>
        ) : null}
        <Box marginTop={1}>
          <Text dimColor>Enter 确认 · Esc 返回</Text>
        </Box>
      </Box>
    );
  }
}
