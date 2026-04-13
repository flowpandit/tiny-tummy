import { motion } from "framer-motion";
import {
  HomeActionBottleIcon,
  HomeActionBreastfeedIcon,
  HomeActionDiaperIcon,
  HomeActionEpisodeIcon,
  HomeActionSleepIcon,
  HomeActionSymptomIcon,
} from "../ui/icons";

interface HomeQuickActionsProps {
  activeBreastfeedingSide: "left" | "right" | null;
  canOpenBreastfeedAction: boolean;
  eliminationActionLabel: string;
  episodeActionLabel: string;
  showBreastfeedAction: boolean;
  onLogElimination: () => void;
  onLogFeed: () => void;
  onOpenBreastfeed: () => void;
  onOpenSleep: () => void;
  onOpenEpisode: () => void;
  onOpenSymptom: () => void;
}

export function HomeQuickActions({
  activeBreastfeedingSide,
  canOpenBreastfeedAction,
  eliminationActionLabel,
  episodeActionLabel,
  showBreastfeedAction,
  onLogElimination,
  onLogFeed,
  onOpenBreastfeed,
  onOpenSleep,
  onOpenEpisode,
  onOpenSymptom,
}: HomeQuickActionsProps) {
  return (
    <div className="px-4 pt-1">
      <div className="grid grid-cols-3 gap-2.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onLogElimination}
          className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center text-white shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
          style={{ background: "var(--gradient-home-action-primary)" }}
        >
          <span className="flex h-4 w-4 items-center justify-center">
            <HomeActionDiaperIcon className="h-4 w-4" />
          </span>
          <p className="mt-1 text-[0.74rem] font-semibold leading-none">{eliminationActionLabel}</p>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onLogFeed}
          className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
          style={{ background: "var(--gradient-home-action-feed)" }}
        >
          <span className="flex h-4 w-4 items-center justify-center text-[var(--color-text)]">
            <HomeActionBottleIcon className="h-4 w-4" />
          </span>
          <p className="mt-1 text-[0.74rem] font-semibold leading-none text-[var(--color-text)]">Log feed</p>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenBreastfeed}
          disabled={!canOpenBreastfeedAction}
          className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
          style={{ background: "var(--gradient-home-action-breastfeed)" }}
        >
          <span className="flex h-4 w-4 items-center justify-center text-[var(--color-text)]">
            <HomeActionBreastfeedIcon className="h-4 w-4" />
          </span>
          <div className="mt-1 flex items-center gap-0.5">
            <p className="text-[0.74rem] font-semibold leading-none text-[var(--color-text)]">
              {showBreastfeedAction ? "Breastfeed" : "Repeat last feed"}
            </p>
            {showBreastfeedAction && activeBreastfeedingSide && (
              <span
                className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-surface-strong)] px-0.5 text-[0.52rem] font-bold text-[var(--color-primary)]"
                aria-label={activeBreastfeedingSide === "left" ? "Left breastfeeding timer running" : "Right breastfeeding timer running"}
              >
                {activeBreastfeedingSide === "left" ? "L" : "R"}
              </span>
            )}
          </div>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenSleep}
          className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
          style={{ background: "var(--gradient-home-action-sleep)" }}
        >
          <span className="flex h-4 w-4 items-center justify-center text-[var(--color-text)]">
            <HomeActionSleepIcon className="h-4 w-4" />
          </span>
          <p className="mt-1 text-[0.74rem] font-semibold leading-none text-[var(--color-text)]">Log sleep</p>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenEpisode}
          className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center text-white shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
          style={{ background: "var(--gradient-home-action-episode)" }}
        >
          <span className="flex h-4 w-4 items-center justify-center">
            <HomeActionEpisodeIcon className="h-4 w-4" />
          </span>
          <p className="mt-1 text-[0.74rem] font-semibold leading-none">{episodeActionLabel}</p>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenSymptom}
          className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center text-white shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
          style={{ background: "var(--gradient-home-action-symptom)" }}
        >
          <span className="flex h-4 w-4 items-center justify-center">
            <HomeActionSymptomIcon className="h-4 w-4" />
          </span>
          <p className="mt-1 text-[0.74rem] font-semibold leading-none">Log symptom</p>
        </motion.button>
      </div>
    </div>
  );
}
