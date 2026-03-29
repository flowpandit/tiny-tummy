import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { getEpisodeTypeLabel } from "../../lib/episode-constants";
import { timeSince } from "../../lib/utils";
import type { Episode, EpisodeEvent } from "../../lib/types";

function getBadgeVariant(episodeType: Episode["episode_type"]) {
  if (episodeType === "constipation") return "caution";
  if (episodeType === "diarrhoea") return "alert";
  return "info";
}

interface EpisodeCardProps {
  activeEpisode: Episode | null;
  events: EpisodeEvent[];
  recentEpisodes: Episode[];
  onOpen: () => void;
}

export function EpisodeCard({
  activeEpisode,
  events,
  recentEpisodes,
  onOpen,
}: EpisodeCardProps) {
  const latestResolved = recentEpisodes.find((episode) => episode.status === "resolved");

  if (activeEpisode) {
    const recentEvents = events.slice(0, 2);

    return (
      <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-soft)]">
              Episode Mode
            </p>
            <p className="mt-2 text-[20px] font-semibold leading-tight text-[var(--color-text)]">
              {getEpisodeTypeLabel(activeEpisode.episode_type)}
            </p>
          </div>
          <Badge variant={getBadgeVariant(activeEpisode.episode_type)}>
            Active
          </Badge>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
          {activeEpisode.summary ?? "Track symptoms, foods, hydration, and progress in one place."}
        </p>

        <p className="mt-3 text-[12px] text-[var(--color-text-soft)]">
          Started {timeSince(activeEpisode.started_at)} · {events.length} update{events.length !== 1 ? "s" : ""}
        </p>

        {recentEvents.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
              >
                <p className="text-sm font-medium text-[var(--color-text)]">{event.title}</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {timeSince(event.logged_at)}
                  {event.notes ? ` · ${event.notes}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        <Button variant="secondary" className="mt-4 w-full" onClick={onOpen}>
          Manage Episode
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-soft)]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-soft)]">
        Episode Mode
      </p>
      <p className="mt-2 text-[20px] font-semibold leading-tight text-[var(--color-text)]">
        Track a health episode
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
        Group symptoms, foods, hydration, and what you tried into one clear story.
      </p>
      {latestResolved?.ended_at && (
        <p className="mt-3 text-[12px] text-[var(--color-text-soft)]">
          Last episode resolved {timeSince(latestResolved.ended_at)}.
        </p>
      )}
      <Button variant="secondary" className="mt-4 w-full" onClick={onOpen}>
        Start Episode
      </Button>
    </div>
  );
}
