import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useMilestoneLogs } from "../hooks/useMilestoneLogs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { PageIntro } from "../components/ui/page-intro";
import { MilestoneLogSheet } from "../components/milestones/MilestoneLogSheet";
import { getMilestoneTypeDescription, getMilestoneTypeLabel } from "../lib/milestone-constants";
import { formatDate, getAgeLabelFromDob, timeSince } from "../lib/utils";

function getThirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 86400000);
}

export function Milestones() {
  const navigate = useNavigate();
  const { activeChild } = useChildContext();
  const { logs, refresh } = useMilestoneLogs(activeChild?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sortedLogs = useMemo(
    () => [...logs].sort((left, right) => new Date(right.logged_at).getTime() - new Date(left.logged_at).getTime()),
    [logs],
  );
  const recentCount = useMemo(
    () => sortedLogs.filter((log) => new Date(log.logged_at).getTime() >= getThirtyDaysAgo().getTime()).length,
    [sortedLogs],
  );

  if (!activeChild) return null;

  const latest = sortedLogs[0] ?? null;

  return (
    <div className="px-4 py-5">
      <button
        onClick={() => navigate("/settings")}
        className="mb-4 flex items-center gap-1 text-sm text-[var(--color-primary)] cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        Back to Settings
      </button>

      <PageIntro
        eyebrow="Tracking"
        title="Milestones"
        description="Capture only the changes that help explain bowel, feeding, or routine shifts. This is context, not a baby memory book."
        meta={`${activeChild.name} · ${getAgeLabelFromDob(activeChild.date_of_birth)}${latest ? ` · last logged ${timeSince(latest.logged_at)}` : ""}`}
        action={<Button variant="cta" size="sm" onClick={() => setSheetOpen(true)}>Add</Button>}
      />

      {sortedLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-strong)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5M8.25 17.25h4.5M6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75Z" />
              </svg>
            </div>
            <p className="mt-4 text-xl font-semibold text-[var(--color-text)]">Add the first useful context point</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Good milestones are things like starting solids, illness, medication, or a routine change that might explain patterns later.
            </p>
            <Button variant="primary" className="mt-5" onClick={() => setSheetOpen(true)}>
              Add first milestone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="border-[var(--color-info)]/20 bg-[var(--color-info-bg)]">
              <CardContent className="py-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Total milestones</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{sortedLogs.length}</p>
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Health-linked context points recorded so far.</p>
              </CardContent>
            </Card>
            <Card className="border-[var(--color-peach)] bg-[var(--color-surface-tint)]">
              <CardContent className="py-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Last 30 days</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{recentCount}</p>
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Recent context changes that may matter in reports.</p>
              </CardContent>
            </Card>
            <Card className="border-[var(--color-mint)] bg-[var(--color-healthy-bg)]">
              <CardContent className="py-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Latest milestone</p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">
                  {latest ? getMilestoneTypeLabel(latest.milestone_type) : "—"}
                </p>
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                  {latest ? formatDate(latest.logged_at) : "Add a milestone to start building context."}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Recent milestones</CardTitle>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Use this to explain why feeding, bowel, or sleep patterns may have changed.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
                  Add milestone
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {sortedLogs.map((log) => (
                  <div key={log.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {getMilestoneTypeLabel(log.milestone_type)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                          {formatDate(log.logged_at)} · {timeSince(log.logged_at)}
                        </p>
                      </div>
                      <Badge variant="info">Context</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {getMilestoneTypeDescription(log.milestone_type)}
                    </p>
                    {log.notes && (
                      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {log.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <MilestoneLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        childId={activeChild.id}
        onLogged={refresh}
      />
    </div>
  );
}
