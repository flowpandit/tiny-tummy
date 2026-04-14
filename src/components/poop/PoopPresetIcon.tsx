import { poop1Icon, poop2Icon, poop3Icon, poop4Icon, poop5Icon, poop6Icon, poop7Icon } from "../../assets/icons";
import { getPoopColorHex } from "../../lib/poop-insights";
import type { PoopLogDraft } from "../../lib/types";

const POOP_PRESET_ICONS: Record<number, string> = {
  1: poop1Icon,
  2: poop2Icon,
  3: poop3Icon,
  4: poop4Icon,
  5: poop5Icon,
  6: poop6Icon,
  7: poop7Icon,
};

export function PoopPresetIcon({
  draft,
  className = "h-10 w-10",
}: {
  draft: Partial<PoopLogDraft>;
  className?: string;
}) {
  const fill = getPoopColorHex(draft.color ?? null);
  const shadow = draft.color === "green" ? "rgba(113, 144, 69, 0.35)" : "rgba(181, 135, 84, 0.28)";
  const iconSrc = POOP_PRESET_ICONS[draft.stool_type ?? 4] ?? poop4Icon;

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: fill,
        filter: `drop-shadow(0 2px 4px ${shadow})`,
        WebkitMaskImage: `url(${iconSrc})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        maskImage: `url(${iconSrc})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
      }}
    />
  );
}
