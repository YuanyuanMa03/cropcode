import React, { useEffect, useState } from "react";
import { useInput } from "ink";
import DropdownMenu from "../DropdownMenu";
import type { ModelConfigSelection, ReasoningEffort } from "@yuanyuanma03/cropcode-core";

import {
  resolveCurrentSettings,
  discoverModels,
  findProviderByBaseURL,
  getReasoningEfforts,
} from "@yuanyuanma03/cropcode-core";

type ModelStep = "model" | "thinking";

type ThinkingModeOption = {
  label: string;
  thinkingEnabled: boolean;
  reasoningEffort?: ReasoningEffort;
};

export const MODEL_COMMAND_MODELS = [
  "deepseek-flash",
  "deepseek-v4-pro",
  "deepseek-v4-flash",
  "deepseek-v4-flash-vision-exp",
] as const;

export const MODEL_COMMAND_THINKING_OPTIONS: ThinkingModeOption[] = [
  { label: "Thinking mode [max]", thinkingEnabled: true, reasoningEffort: "max" },
  { label: "Thinking mode [high]", thinkingEnabled: true, reasoningEffort: "high" },
  { label: "Thinking mode [low]", thinkingEnabled: true, reasoningEffort: "low" },
  { label: "No thinking", thinkingEnabled: false },
];

function getThinkingOptionIndex(config: Pick<ModelConfigSelection, "thinkingEnabled" | "reasoningEffort">): number {
  const index = MODEL_COMMAND_THINKING_OPTIONS.findIndex((option) => {
    if (!config.thinkingEnabled) {
      return !option.thinkingEnabled;
    }
    return option.thinkingEnabled && option.reasoningEffort === config.reasoningEffort;
  });
  return index >= 0 ? index : 0;
}

type Props = {
  open: boolean;
  modelConfig: ModelConfigSelection;
  width: number;
  onClose: () => void;
  onModelConfigChange: (selection: ModelConfigSelection) => string | Promise<string>;
  onStatusMessage?: (message: string | null) => void;
};

const ModelsDropdown: React.FC<Props> = ({
  open,
  modelConfig,
  width,
  onClose,
  onModelConfigChange,
  onStatusMessage,
}) => {
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const settings = resolveCurrentSettings();
  const [models, setModels] = useState<string[]>(() =>
    Array.from(
      new Set([
        ...(findProviderByBaseURL(settings.baseURL)?.models.map((model) => model.id) ?? MODEL_COMMAND_MODELS),
        modelConfig.model,
      ])
    )
  );
  const efforts = getReasoningEfforts(pendingModel ?? modelConfig.model, settings.baseURL);
  const thinkingOptions: ThinkingModeOption[] = [
    ...(efforts.length
      ? efforts.map((effort) => ({
          label: `Thinking mode [${effort}]`,
          thinkingEnabled: true,
          reasoningEffort: effort,
        }))
      : [{ label: "Thinking mode", thinkingEnabled: true }]),
    { label: "No thinking", thinkingEnabled: false },
  ];
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void discoverModels().then((items) => {
      if (!cancelled) setModels(items.map((item) => item.id));
    });
    return () => {
      cancelled = true;
    };
  }, [open]);
  const [step, setStep] = useState<ModelStep | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Initialize state when opened
  useEffect(() => {
    if (open) {
      const presetIds =
        findProviderByBaseURL(resolveCurrentSettings().baseURL)?.models.map((model) => model.id) ??
        MODEL_COMMAND_MODELS;
      const currentIndex = presetIds.findIndex((m) => m === modelConfig.model);
      setPendingModel(null);
      setStep("model");
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setStep(null);
    }
  }, [open, modelConfig.model]);

  // Validate activeIndex bounds
  useEffect(() => {
    if (!step) {
      return;
    }
    const optionCount = step === "model" ? models.length : thinkingOptions.length;
    if (activeIndex >= optionCount) {
      setActiveIndex(Math.max(0, optionCount - 1));
    }
  }, [activeIndex, step, models.length, thinkingOptions.length]);

  function getSelectedThinkingIndex(): number {
    const index = thinkingOptions.findIndex(
      (option) =>
        option.thinkingEnabled === modelConfig.thinkingEnabled &&
        (!option.thinkingEnabled || !option.reasoningEffort || option.reasoningEffort === modelConfig.reasoningEffort)
    );
    return Math.max(0, index);
  }

  function selectItem(): void {
    if (step === "model") {
      const model = models[activeIndex] ?? modelConfig.model;
      setPendingModel(model);
      setStep("thinking");
      setActiveIndex(getSelectedThinkingIndex());
      return;
    }

    const option = thinkingOptions[activeIndex] ?? thinkingOptions[0]!;
    const selection: ModelConfigSelection = {
      model: pendingModel ?? modelConfig.model,
      thinkingEnabled: option.thinkingEnabled,
      reasoningEffort: option.reasoningEffort ?? modelConfig.reasoningEffort,
    };
    onClose();
    Promise.resolve(onModelConfigChange(selection))
      .then((message) => {
        if (message) {
          onStatusMessage?.(message);
        }
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        onStatusMessage?.(`Failed to update model settings: ${msg}`);
      });
  }

  useInput(
    (input, key) => {
      if (!step) {
        return;
      }

      const optionCount = step === "model" ? models.length : thinkingOptions.length;

      if (key.upArrow) {
        setActiveIndex((idx) => (idx - 1 + optionCount) % optionCount);
        return;
      }
      if (key.downArrow) {
        setActiveIndex((idx) => (idx + 1) % optionCount);
        return;
      }
      if ((input === " " && !key.ctrl && !key.meta) || (key.return && !key.shift && !key.meta)) {
        selectItem();
        return;
      }
      if (key.tab || key.escape) {
        onClose();
        return;
      }
    },
    { isActive: open }
  );

  if (!open || !step) {
    return null;
  }

  const items =
    step === "model"
      ? models.map((model) => ({
          key: model,
          label: model,
          description: model === modelConfig.model ? "current model" : "",
          selected: model === (pendingModel ?? modelConfig.model),
        }))
      : thinkingOptions.map((option, i) => ({
          key: option.label,
          label: option.label,
          description: option.thinkingEnabled ? `reasoningEffort: ${option.reasoningEffort}` : "thinking disabled",
          selected: getSelectedThinkingIndex() === i,
        }));

  return (
    <DropdownMenu
      width={width}
      title={step === "model" ? "Select Model" : "Select Thinking Mode"}
      helpText={step === "model" ? "Space/Enter select model · Esc to cancel" : "Space/Enter apply · Esc to cancel"}
      items={items}
      activeIndex={activeIndex}
      activeColor="#229ac3"
      maxVisible={6}
    />
  );
};

export { getThinkingOptionIndex };
export default ModelsDropdown;
