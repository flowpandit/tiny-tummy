import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useStats } from "../hooks/useStats";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDietLogs } from "../hooks/useDietLogs";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
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
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const { logs } = usePoopLogs(activeChild?.id ?? null);
  const { logs: dietLogs } = useDietLogs(activeChild?.id ?? null);
  const { frequency, consistency, colorDist } = useStats(
    activeChild?.id ?? null,
    days,
  );

  if (!activeChild) return null;

  const realLogCount = logs.filter((l) => l.is_no_poop === 0).length;

  if (realLogCount < 3) {
    return (
      <div className="px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-16 text-center shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-strong)]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-primary)" className="w-8 h-8">
            <path fillRule="evenodd" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12Zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75a.75.75 0 0 1 .75-.75Zm3.75 1.5a.75.75 0 0 0-1.5 0v5.25a.75.75 0 0 0 1.5 0v-5.25Z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-[var(--color-text)] text-xl font-semibold">
          A few more logs and we'll show you trends
        </p>
        <p className="mt-2 text-base text-[var(--color-muted)]">
          Log at least 3 entries to see charts and patterns.
        </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <div className="my-5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Patterns</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[var(--color-text)]">
              Trends
            </h2>
          </div>
        {/* Period toggle */}
        <div className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-1 shadow-[var(--shadow-soft)]">
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
      <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
        Softer visual summaries to help you spot frequency, consistency, color, and meal correlations over time.
      </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Frequency chart */}
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

        {/* Consistency trend */}
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

        {/* Color distribution */}
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

        {/* Diet correlation timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Meals & Poops</CardTitle>
            <p className="text-xs text-[var(--color-muted)]">
              Timeline to help spot food→poop patterns
            </p>
          </CardHeader>
          <CardContent>
            <DietCorrelation poopLogs={logs} dietLogs={dietLogs} days={days} />
          </CardContent>
        </Card>

        {/* Report link */}
        <button
          onClick={() => navigate("/report")}
          className="w-full py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-primary)] font-medium cursor-pointer hover:bg-[var(--color-primary)]/5 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
          </svg>
          Generate Report for Doctor
        </button>
      </div>
    </div>
  );
}
