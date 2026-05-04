import { motion } from "framer-motion";
import { HomeActionBottleIcon, HomeActionDiaperIcon, HomeActionSleepIcon, PoopIcon } from "../ui/icons";

interface HomeQuickActionsProps {
  onLogDiaper: () => void;
  onLogPoop: () => void;
  onLogFeed: () => void;
  onOpenSleep: () => void;
}

const ACTIONS = [
  {
    id: "diaper",
    label: "Log diaper",
    background: "var(--gradient-home-action-diaper)",
    icon: <HomeActionDiaperIcon className="h-6 w-6 text-[var(--color-home-action-diaper-icon)] md:h-8 md:w-8" />,
    text: "text-[var(--color-home-action-diaper-text)]",
  },
  {
    id: "poop",
    label: "Log poop",
    background: "var(--gradient-home-action-poop)",
    icon: <PoopIcon className="h-6 w-6 md:h-8 md:w-8" color="var(--color-home-action-poop-icon)" />,
    text: "text-[var(--color-home-action-poop-text)]",
  },
  {
    id: "feed",
    label: "Log feed",
    background: "var(--gradient-home-action-feed)",
    icon: <HomeActionBottleIcon className="h-6 w-6 text-[var(--color-home-action-feed-icon)] md:h-8 md:w-8" />,
    text: "text-[var(--color-home-action-feed-text)]",
  },
  {
    id: "sleep",
    label: "Log sleep",
    background: "var(--gradient-home-action-sleep)",
    icon: <HomeActionSleepIcon className="h-6 w-6 text-[var(--color-home-action-sleep-icon)] md:h-8 md:w-8" />,
    text: "text-[var(--color-home-action-sleep-text)]",
  },
] as const;

export function HomeQuickActions({
  onLogDiaper,
  onLogPoop,
  onLogFeed,
  onOpenSleep,
}: HomeQuickActionsProps) {
  const actions = {
    diaper: onLogDiaper,
    poop: onLogPoop,
    feed: onLogFeed,
    sleep: onOpenSleep,
  };

  return (
    <div className="px-4 pt-0 md:px-10 md:pt-1">
      <div className="flex items-center justify-between gap-3 px-3 md:px-0">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.85rem]">
          Quick actions
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-4 gap-2 md:mt-4 md:gap-6">
        {ACTIONS.map((action) => (
          <motion.button
            key={action.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={actions[action.id]}
            className="flex h-[66px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-[var(--color-home-card-border)] text-center shadow-[0_12px_26px_rgba(187,144,108,0.08)] transition-transform hover:-translate-y-0.5 md:h-[160px] md:gap-5 md:rounded-[22px]"
            style={{ background: action.background }}
          >
            <div className="flex h-6 w-6 items-center justify-center md:h-11 md:w-11">
              {action.icon}
            </div>
            <p className={`text-[0.78rem] font-semibold leading-tight tracking-[-0.02em] md:text-[1.2rem] ${action.text}`}>
              {action.label}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
