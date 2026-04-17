import { useMemo, useState } from "react";
import { useActiveChild } from "../contexts/ChildContext";
import { useMilestoneLogs } from "../hooks/useMilestoneLogs";
import { getMilestoneJourneyCopy } from "../lib/milestone-view-model";
import { MilestoneLogSheet } from "../components/milestones/MilestoneLogSheet";
import { MilestoneRecentActivitySection } from "../components/milestones/MilestoneRecentActivitySection";
import { MilestoneSummaryBoard } from "../components/milestones/MilestoneSummaryBoard";
import { PageBody } from "../components/ui/page-layout";

export function Milestones() {
  const activeChild = useActiveChild();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { logs, isLoading, refresh } = useMilestoneLogs(activeChild?.id ?? null);

  const totalMilestones = logs.length;
  const lastThirtyDays = useMemo(() => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 30);
    return logs.filter((entry) => new Date(entry.logged_at).getTime() >= threshold.getTime()).length;
  }, [logs]);

  if (!activeChild) return null;

  return (
    <PageBody className="mt-0 space-y-5 px-4 py-5 md:px-6 lg:px-8">
      <MilestoneSummaryBoard
        child={activeChild}
        journeyCopy={getMilestoneJourneyCopy(logs)}
        totalMilestones={totalMilestones}
        lastThirtyDays={lastThirtyDays}
        onAddMilestone={() => setSheetOpen(true)}
      />

      <MilestoneRecentActivitySection
        logs={logs}
        isLoading={isLoading}
        onAddMilestone={() => setSheetOpen(true)}
      />

      <MilestoneLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        childId={activeChild.id}
        onLogged={refresh}
      />
    </PageBody>
  );
}
