import type { ReactNode } from "react";
import type { CodingPlanUpgradeDialogTarget } from "@/settings/CodingPlanUpgradeDialog.js";
import type { CodingPlanEntryInventory } from "@/hooks/useCodingPlanEntryPlanList.js";

const inventory: CodingPlanEntryInventory = { entryPlanList: "", status: "ready", retry() {} };
const disabledSubscription = {
  inventory,
  openCodingPlanUpgrade(
    _target: CodingPlanUpgradeDialogTarget,
    observation?: { signal: AbortSignal; onResult: (opened: boolean) => void },
  ) {
    if (!observation?.signal.aborted) observation?.onResult(false);
    return false;
  },
};

export function CodingPlanUpgradeDialogProvider({ children }: { children: ReactNode }) {
  return children;
}
export function useCodingPlanUpgradeDialog() {
  return disabledSubscription;
}
export function useOptionalCodingPlanUpgradeDialog() {
  return disabledSubscription;
}
