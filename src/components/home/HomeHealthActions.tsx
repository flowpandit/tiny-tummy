import { HomeActionEpisodeIcon, HomeActionSymptomIcon } from "../ui/icons";

interface HomeHealthActionsProps {
  onLogSymptoms: () => void;
  onOpenEpisode: () => void;
}

const HEALTH_ACTIONS = [
  {
    id: "symptoms",
    label: "Log symptoms",
    detail: "Signs, severity, notes",
    background: "var(--gradient-home-action-symptom)",
    icon: <HomeActionSymptomIcon className="h-6 w-6 md:h-8 md:w-8" />,
    iconSurface: "rgba(255, 255, 255, 0.26)",
    textClassName: "text-white",
  },
  {
    id: "episode",
    label: "Episode",
    detail: "Start a new episode",
    background: "var(--gradient-home-action-episode)",
    icon: <HomeActionEpisodeIcon className="h-6 w-6 md:h-8 md:w-8" />,
    iconSurface: "rgba(255, 255, 255, 0.24)",
    textClassName: "text-white",
  },
] as const;

export function HomeHealthActions({
  onLogSymptoms,
  onOpenEpisode,
}: HomeHealthActionsProps) {
  const handlers = {
    symptoms: onLogSymptoms,
    episode: onOpenEpisode,
  };

  return (
    <section className="px-4 pt-0 md:px-10 md:pt-1">
      <p className="px-3 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:px-0 md:text-[0.85rem]">
        Health
      </p>

      <div className="mt-2.5 grid grid-cols-2 gap-2 md:mt-4 md:gap-6">
        {HEALTH_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={handlers[action.id]}
            className="flex min-h-[78px] items-center gap-3 rounded-[16px] border border-[var(--color-home-card-border)] px-3.5 py-3 text-left shadow-[0_12px_26px_rgba(187,144,108,0.08)] transition-transform hover:-translate-y-0.5 md:min-h-[124px] md:gap-5 md:rounded-[22px] md:px-6 md:py-5"
            style={{ background: action.background }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full md:h-14 md:w-14"
              style={{ background: action.iconSurface }}
            >
              <span className={action.textClassName}>{action.icon}</span>
            </span>
            <span className="min-w-0">
              <span className={`block text-[0.9rem] font-semibold leading-tight tracking-[-0.02em] md:text-[1.2rem] ${action.textClassName}`}>
                {action.label}
              </span>
              <span className="mt-0.5 block text-[0.72rem] font-medium leading-snug text-white/82 md:mt-1 md:text-[0.92rem]">
                {action.detail}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
