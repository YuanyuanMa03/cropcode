import React, { useEffect, useState } from "react";
import { useInput } from "ink";
import DropdownMenu from "../../DropdownMenu";
import type { PermissionDefaultMode } from "../../../settings";

type PermissionStep = "mode" | "save";

type ModeOption = {
  label: string;
  mode: PermissionDefaultMode;
  description: string;
};

const MODE_OPTIONS: ModeOption[] = [
  { label: "allowAll", mode: "allowAll", description: "全部自动允许（默认）" },
  { label: "askAll", mode: "askAll", description: "每步确认" },
  { label: "plan", mode: "plan", description: "只读允许，写入需确认" },
  { label: "acceptEdits", mode: "acceptEdits", description: "文件读写允许，bash/网络需确认" },
  { label: "bypassPermissions", mode: "bypassPermissions", description: "绕过所有限制（含deny）" },
];

type SaveOption = {
  label: string;
  target: "user" | "project";
  description: string;
};

type Props = {
  open: boolean;
  currentMode: PermissionDefaultMode;
  width: number;
  onClose: () => void;
  onPermissionsChange: (mode: PermissionDefaultMode, saveTarget: "user" | "project") => string | Promise<string>;
  onStatusMessage?: (message: string | null) => void;
  hasProjectSettings: boolean;
};

const PermissionsDropdown: React.FC<Props> = ({
  open,
  currentMode,
  width,
  onClose,
  onPermissionsChange,
  onStatusMessage,
  hasProjectSettings,
}) => {
  const [step, setStep] = useState<PermissionStep | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingMode, setPendingMode] = useState<PermissionDefaultMode | null>(null);

  const saveOptions: SaveOption[] = [
    { label: "User-level", target: "user", description: "~/.cropcode/settings.json" },
    { label: "Project-level", target: "project", description: ".cropcode/settings.json" },
  ];

  useEffect(() => {
    if (open) {
      const currentIndex = MODE_OPTIONS.findIndex((o) => o.mode === currentMode);
      setPendingMode(null);
      setStep("mode");
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setStep(null);
    }
  }, [open, currentMode]);

  useEffect(() => {
    if (!step) {
      return;
    }
    const optionCount = step === "mode" ? MODE_OPTIONS.length : saveOptions.length;
    if (activeIndex >= optionCount) {
      setActiveIndex(Math.max(0, optionCount - 1));
    }
  }, [activeIndex, step, saveOptions.length]);

  function selectItem(): void {
    if (step === "mode") {
      const selected = MODE_OPTIONS[activeIndex];
      if (!selected) return;
      if (selected.mode === currentMode) {
        onClose();
        return;
      }
      setPendingMode(selected.mode);
      setStep("save");
      setActiveIndex(hasProjectSettings ? 1 : 0);
      return;
    }

    const saveOption = saveOptions[activeIndex];
    if (!saveOption) return;
    const mode = pendingMode ?? currentMode;
    onClose();
    Promise.resolve(onPermissionsChange(mode, saveOption.target))
      .then((message) => {
        if (message) {
          onStatusMessage?.(message);
        }
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        onStatusMessage?.(`Failed to update permissions: ${msg}`);
      });
  }

  useInput(
    (input, key) => {
      if (!step) {
        return;
      }

      const optionCount = step === "mode" ? MODE_OPTIONS.length : saveOptions.length;

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
    step === "mode"
      ? MODE_OPTIONS.map((option) => ({
          key: option.mode,
          label: option.label,
          description: option.mode === currentMode ? `${option.description} (current)` : option.description,
          selected: option.mode === (pendingMode ?? currentMode),
        }))
      : saveOptions.map((option) => ({
          key: option.target,
          label: option.label,
          description: option.description,
          selected: option.target === (hasProjectSettings ? "project" : "user"),
        }));

  return (
    <DropdownMenu
      width={width}
      title={step === "mode" ? "Permission Mode" : "Save To"}
      helpText={step === "mode" ? "Space/Enter select mode · Esc to cancel" : "Space/Enter apply · Esc to cancel"}
      items={items}
      activeIndex={activeIndex}
      activeColor="#229ac3"
      maxVisible={6}
    />
  );
};

export default PermissionsDropdown;
