import { cn } from "@/components/lib/utils.js";

/** Upstream export names stay stable; the visible identity belongs to CropCode. */
export function ZCodeAboutLogo({ className }: { className?: string }) {
  return (
    <img src="./cropcode.png" alt="" className={cn("size-10 shrink-0 object-contain", className)} />
  );
}

export function ZCodeWordmarkLogo({ className }: { className?: string }) {
  return <span className={cn("shrink-0 font-semibold tracking-tight", className)}>CropCode</span>;
}
