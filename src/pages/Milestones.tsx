import { useMemo, useState } from "react";
import { useChildContext } from "../contexts/ChildContext";
import { useMilestoneLogs } from "../hooks/useMilestoneLogs";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { PageIntro } from "../components/ui/page-intro";
import { EmptyState, InsetPanel, PageBackButton, PageBody, SectionHeading, StatGrid, StatTile } from "../components/ui/page-layout";
import { MilestoneLogSheet } from "../components/milestones/MilestoneLogSheet";
import { getMilestoneTypeDescription, getMilestoneTypeLabel } from "../lib/milestone-constants";
import { formatDate, getAgeLabelFromDob, timeSince } from "../lib/utils";

function getThirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 86400000);
}

export function Milestones() {
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
    <PageBody>
      <PageBackButton fallbackTo="/settings" />

      <PageIntro
        eyebrow="Tracking"
        title="Milestones"
        description="Capture only the changes that help explain bowel, feeding, or routine shifts. This is context, not a baby memory book."
        meta={`${activeChild.name} · ${getAgeLabelFromDob(activeChild.date_of_birth)}${latest ? ` · last logged ${timeSince(latest.logged_at)}` : ""}`}
        action={<Button variant="cta" size="sm" onClick={() => setSheetOpen(true)}>Add</Button>}
      />

      {sortedLogs.length === 0 ? (
        <EmptyState
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5M8.25 17.25h4.5M6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75Z" />
            </svg>
          )}
          title="Add the first useful context point"
          description="Good milestones are things like starting solids, illness, medication, or a routine change that might explain patterns later."
          action={(
            <Button variant="primary" onClick={() => setSheetOpen(true)}>
              Add first milestone
            </Button>
          )}
        />
      ) : (
        <>
          <StatGrid>
            <StatTile
              eyebrow="Total milestones"
              value={sortedLogs.length}
              description="Health-linked context points recorded so far."
              tone="info"
            />
            <StatTile
              eyebrow="Last 30 days"
              value={recentCount}
              description="Recent context changes that may matter in reports."
              tone="cta"
            />
            <StatTile
              eyebrow="Latest milestone"
              value={latest ? getMilestoneTypeLabel(latest.milestone_type) : "—"}
              description={latest ? formatDate(latest.logged_at) : "Add a milestone to start building context."}
              tone="healthy"
            />
          </StatGrid>

          <Card>
            <CardHeader>
              <SectionHeading
                title="Recent milestones"
                description="Use this to explain why feeding, bowel, or sleep patterns may have changed."
                action={(
                  <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
                    Add milestone
                  </Button>
                )}
              />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {sortedLogs.map((log) => (
                  <InsetPanel key={log.id}>
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
                  </InsetPanel>
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
    </PageBody>
  );
}
