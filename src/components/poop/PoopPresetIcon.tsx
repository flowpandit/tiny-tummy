import poop1Icon from "../../assets/svg-assets/icons/poop-1.svg";
import poop2Icon from "../../assets/svg-assets/icons/poop-2.svg";
import poop3Icon from "../../assets/svg-assets/icons/poop-3.svg";
import poop4Icon from "../../assets/svg-assets/icons/poop-4.svg";
import poop5Icon from "../../assets/svg-assets/icons/poop-5.svg";
import poop6Icon from "../../assets/svg-assets/icons/poop-6.svg";
import poop7Icon from "../../assets/svg-assets/icons/poop-7.svg";
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
