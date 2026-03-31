import { useState } from "react";
import { useChildContext } from "../contexts/ChildContext";
import { useStats } from "../hooks/useStats";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { PageBody, EmptyState } from "../components/ui/page-layout";
import { DiscoveryLinks } from "../components/discovery/DiscoveryLinks";
import { FrequencyChart } from "../components/dashboard/FrequencyChart";
import { ConsistencyTrend } from "../components/dashboard/ConsistencyTrend";
import { ColorDistribution } from "../components/dashboard/ColorDistribution";
import { DietCorrelation } from "../components/dashboard/DietCorrelation";
import { cn } from "../lib/cn";

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

export function Dashboard() {
  const { activeChild } = useChildContext();
  const [days, setDays] = useState(7);
  const { logs } = usePoopLogs(activeChild?.id ?? null);
  const { logs: feedingLogs } = useFeedingLogs(activeChild?.id ?? null);
  const { frequency, consistency, colorDist } = useStats(
    activeChild?.id ?? null,
    days,
  );

  if (!activeChild) return null;

  const realLogCount = logs.filter((l) => l.is_no_poop === 0).length;

  if (realLogCount < 3) {
    return (
      <PageBody className="py-8">
        <EmptyState
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-primary)" className="w-8 h-8">
              <path fillRule="evenodd" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12Zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75a.75.75 0 0 1 .75-.75Zm3.75 1.5a.75.75 0 0 0-1.5 0v5.25a.75.75 0 0 0 1.5 0v-5.25Z" clipRule="evenodd" />
            </svg>
          )}
          title="A few more logs and trends will start to settle in"
          description="Log at least three poop entries to unlock the calmer trend views."
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <section className="space-y-4 border-b border-[var(--color-border)] pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Patterns</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[var(--color-text)]">
              Trends
            </h2>
            <p className="mt-3 max-w-[42ch] text-base leading-relaxed text-[var(--color-text-secondary)]">
              Frequency, consistency, color, and feed timing in one place so patterns are easier to spot.
            </p>
          </div>
          <div className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors duration-200",
                  days === opt.value
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-soft)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            {frequency.length > 0 ? (
              <FrequencyChart data={frequency} days={days} />
            ) : (
              <p className="text-sm text-[var(--color-muted)] text-center py-8">
                No data for this period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consistency Trend</CardTitle>
            <p className="text-xs text-[var(--color-muted)]">
              Types 3-5 are in the normal range (dashed lines)
            </p>
          </CardHeader>
          <CardContent>
            {consistency.length > 0 ? (
              <ConsistencyTrend data={consistency} />
            ) : (
              <p className="text-sm text-[var(--color-muted)] text-center py-8">
                No type data for this period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Color Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {colorDist.length > 0 ? (
              <ColorDistribution data={colorDist} />
            ) : (
              <p className="text-sm text-[var(--color-muted)] text-center py-8">
                No color data for this period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feeds & Poops</CardTitle>
            <p className="text-xs text-[var(--color-muted)]">
              Timeline to help spot feeding and food→poop patterns
            </p>
          </CardHeader>
          <CardContent>
            <DietCorrelation poopLogs={logs} feedingLogs={feedingLogs} days={days} />
          </CardContent>
        </Card>

        <DiscoveryLinks
          eyebrow="Next"
          title="Use trends with the right follow-up"
          description="Trend is the analysis surface. These adjacent pages help turn patterns into action."
          compact
          items={[
            {
              to: "/report",
              title: "Generate report",
              description: "Prepare a summary for your doctor.",
              tone: "cta",
            },
            {
              to: "/history",
              title: "History",
              description: "Inspect the timeline behind the charts.",
            },
            {
              to: "/growth",
              title: "Growth",
              description: "Check whether body trends line up too.",
              tone: "info",
            },
            {
              to: "/guidance",
              title: "Guidance",
              description: "Open evidence-based context when needed.",
              tone: "healthy",
            },
          ]}
        />
      </div>
    </PageBody>
  );
}
