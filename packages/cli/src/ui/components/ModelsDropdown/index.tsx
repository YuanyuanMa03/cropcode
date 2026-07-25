import React, { useEffect, useMemo, useState } from "react";
import { useInput } from "ink";
import DropdownMenu from "../../DropdownMenu";
import type { ModelConfigSelection, ReasoningEffort, DiscoveredModel } from "@YuanyuanMa03/cropcode-core";
import { findProviderById, findModelInProvider, discoverModels, supportsThinking } from "@YuanyuanMa03/cropcode-core";
import { getActiveCredential } from "@YuanyuanMa03/cropcode-core";

type ModelStep = "model" | "thinking";

type ThinkingModeOption = {
  label: string;
  thinkingEnabled: boolean;
  reasoningEffort?: ReasoningEffort;
};

/**
 * Build thinking-mode options dynamically from the selected model's preset.
 * All providers share the same unified effort tiers: low/medium/high/max.
 * Falls back to the full four-tier set if the model has no declared efforts.
 * Unknown/discovered models without a preset get the full set.
 */
const FALLBACK_EFFORTS: ReasoningEffort[] = ["max", "high", "medium", "low"];

function buildThinkingOptions(modelId: string): ThinkingModeOption[] {
  const options: ThinkingModeOption[] = [];
  if (supportsThinking(modelId)) {
    const cred = getActiveCredential();
    let efforts: string[] | undefined;
    if (cred) {
      const match = findModelInProvider(cred.providerId, modelId);
      efforts = match?.reasoningEfforts;
    }
    // Fallback for models that support thinking but have no declared efforts,
    // or for unknown/discovered models without a preset.
    const effortList = (efforts?.length ? efforts : FALLBACK_EFFORTS) as ReasoningEffort[];
    for (const effort of effortList) {
      options.push({
        label: `Thinking mode [${effort}]`,
        thinkingEnabled: true,
        reasoningEffort: effort,
      });
    }
  }
  options.push({ label: "No thinking", thinkingEnabled: false });
  return options;
}

function getThinkingOptionIndex(
  config: Pick<ModelConfigSelection, "thinkingEnabled" | "reasoningEffort">,
  options: ThinkingModeOption[]
): number {
  const index = options.findIndex((option) => {
    if (!config.thinkingEnabled) {
      return !option.thinkingEnabled;
    }
    return option.thinkingEnabled && option.reasoningEffort === config.reasoningEffort;
  });
  return index >= 0 ? index : 0;
}

function resolvePresetModels(): DiscoveredModel[] {
  const cred = getActiveCredential();
  if (cred) {
    const provider = findProviderById(cred.providerId);
    if (provider) {
      return provider.models.map((preset) => ({ id: preset.id, preset, unknown: false }));
    }
  }
  return [];
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
  const [step, setStep] = useState<ModelStep | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const [models, setModels] = useState<DiscoveredModel[]>(resolvePresetModels);

  // Thinking options are built from the selected model's preset reasoningEfforts.
  const thinkingOptions = useMemo(
    () => buildThinkingOptions(pendingModel ?? modelConfig.model),
    [pendingModel, modelConfig.model]
  );

  // Dynamic model discovery: when the dropdown opens, fetch the provider's
  // actual available models via GET /models and merge with presets. Newly
  // released models not yet in provider-presets.ts appear as "unknown" entries.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void discoverModels().then((discovered) => {
      if (!cancelled && discovered.length > 0) {
        setModels(discovered);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const currentIndex = models.findIndex((m) => m.id === modelConfig.model);
      setPendingModel(null);
      setStep("model");
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setStep(null);
    }
  }, [open, modelConfig.model, models]);

  useEffect(() => {
    if (!step) {
      return;
    }
    const optionCount = step === "model" ? models.length : thinkingOptions.length;
    if (activeIndex >= optionCount) {
      setActiveIndex(Math.max(0, optionCount - 1));
    }
  }, [activeIndex, step, models.length, thinkingOptions.length]);

  function selectItem(): void {
    if (step === "model") {
      const model = models[activeIndex]?.id ?? modelConfig.model;
      setPendingModel(model);
      setStep("thinking");
      setActiveIndex(getThinkingOptionIndex(modelConfig, thinkingOptions));
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
          key: model.id,
          label: model.unknown ? `${model.id} (new)` : model.preset?.label || model.id,
          description: model.id === modelConfig.model ? "current" : "",
          selected: model.id === (pendingModel ?? modelConfig.model),
        }))
      : thinkingOptions.map((option, i) => ({
          key: option.label,
          label: option.label,
          description: option.thinkingEnabled ? `reasoningEffort: ${option.reasoningEffort}` : "thinking disabled",
          selected: getThinkingOptionIndex(modelConfig, thinkingOptions) === i,
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
