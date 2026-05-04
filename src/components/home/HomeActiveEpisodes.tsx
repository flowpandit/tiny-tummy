import { getEpisodeTypeLabel } from "../../lib/episode-constants";
import { formatDate } from "../../lib/utils";
import type { Episode } from "../../lib/types";
import { HomeActionEpisodeIcon } from "../ui/icons";

interface HomeActiveEpisodesProps {
  episodes: Episode[];
  onSelectEpisode: (episode: Episode) => void;
}

export function HomeActiveEpisodes({
  episodes,
  onSelectEpisode,
}: HomeActiveEpisodesProps) {
  if (episodes.length === 0) return null;

  return (
    <section className="px-4 pt-0 md:px-10 md:pt-1">
      <div className="flex items-center justify-between gap-3 px-3 md:px-0">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.85rem]">
          Active episodes
        </p>
        <p className="text-[0.78rem] font-semibold text-[var(--color-text-soft)] md:text-[0.92rem]">
          {episodes.length}
        </p>
      </div>

      <div className="mt-2.5 grid gap-2 md:mt-4 md:grid-cols-2 md:gap-6">
        {episodes.map((episode) => (
          <button
            key={episode.id}
            type="button"
            onClick={() => onSelectEpisode(episode)}
            className="flex min-h-[78px] items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left shadow-[0_12px_26px_rgba(187,144,108,0.08)] transition-transform hover:-translate-y-0.5 md:min-h-[118px] md:gap-5 md:rounded-[22px] md:px-6 md:py-5"
            style={{
              background: "var(--color-home-card-surface)",
              borderColor: "var(--color-home-card-border)",
            }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-info-bg)] text-[var(--color-info)] md:h-14 md:w-14">
              <HomeActionEpisodeIcon className="h-6 w-6 md:h-8 md:w-8" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.95rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1.2rem]">
                {getEpisodeTypeLabel(episode.episode_type)}
              </span>
              <span className="mt-0.5 block text-[0.78rem] font-medium leading-snug text-[var(--color-text-secondary)] md:mt-1 md:text-[0.92rem]">
                Started {formatDate(episode.started_at)}
              </span>
              {episode.summary && (
                <span className="mt-0.5 block truncate text-[0.72rem] leading-snug text-[var(--color-text-soft)] md:text-[0.86rem]">
                  {episode.summary}
                </span>
              )}
            </span>
            <span aria-hidden="true" className="text-[1.35rem] leading-none text-[var(--color-home-chevron)] md:text-[1.75rem]">
              ›
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
