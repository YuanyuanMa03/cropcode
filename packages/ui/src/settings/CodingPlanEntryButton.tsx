import type { ComponentProps } from "react";
import type { Button } from "@/components/ui/button.js";

export function useCodingPlanEntryGate(): {
  status: "ready" | "loading" | "error";
  label: string | undefined;
  retry: (() => void) | undefined;
} {
  return { status: "ready" as const, label: undefined, retry: undefined };
}

/** Product subscriptions are not part of CropCode. */
export function CodingPlanEntryButton(
  _props: ComponentProps<typeof Button> & { bypassGate?: boolean },
) {
  return null;
}
