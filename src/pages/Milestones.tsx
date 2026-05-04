import { useMemo, useState } from "react";
import { useActiveChild } from "../contexts/ChildContext";
import { useMilestoneLogs } from "../hooks/useMilestoneLogs";
import { getMilestoneJourneyCopy } from "../lib/milestone-view-model";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { ScenicHero } from "../components/layout/ScenicHero";
import { MilestoneLogSheet } from "../components/milestones/MilestoneLogSheet";
import { MilestoneHeroMetricsCard } from "../components/milestones/MilestoneHeroMetricsCard";
import { MilestoneInsightCard } from "../components/milestones/MilestoneInsightCard";
import { MilestoneQuickLogCard } from "../components/milestones/MilestoneQuickLogCard";
import { MilestoneRecentActivitySection } from "../components/milestones/MilestoneRecentActivitySection";
import { Button } from "../components/ui/button";
import { PageBody } from "../components/ui/page-layout";
import type { MilestoneType } from "../lib/types";

export function Milestones() {
  const activeChild = useActiveChild();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [initialMilestoneType, setInitialMilestoneType] = useState<MilestoneType>("started_solids");
  const { logs, isLoading, refresh } = useMilestoneLogs(activeChild?.id ?? null);

  const totalMilestones = logs.length;
  const lastThirtyDays = useMemo(() => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 30);
    return logs.filter((entry) => new Date(entry.logged_at).getTime() >= threshold.getTime()).length;
  }, [logs]);
  const latestMilestone = logs[0] ?? null;
  const recentLogs = useMemo(() => logs.slice(0, 3), [logs]);

  if (!activeChild) return null;

  const openMilestoneSheet = (type: MilestoneType = "started_solids") => {
    setInitialMilestoneType(type);
    setSheetOpen(true);
  };

  return (
    <PageBody className="-mt-8 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Milestones"
        description="Capture context shifts that help patterns make sense later."
        action={<Button variant="cta" size="sm" onClick={() => openMilestoneSheet()}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        showChildInfo={false}
      />

      <div className="px-4 md:px-10">
        <MilestoneHeroMetricsCard
          className="-mt-36 md:-mt-32"
          latestTimestamp={latestMilestone?.logged_at ?? null}
          totalMilestones={totalMilestones}
          lastThirtyDays={lastThirtyDays}
        />
      </div>

      <div className="space-y-3 px-4 py-3 md:space-y-5 md:px-10 md:py-5">
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <MilestoneQuickLogCard
            latestMilestone={latestMilestone}
            onAddMilestone={openMilestoneSheet}
          />

          <MilestoneInsightCard
            childName={activeChild.name}
            journeyCopy={getMilestoneJourneyCopy(logs)}
            latestMilestone={latestMilestone}
            lastThirtyDays={lastThirtyDays}
            totalMilestones={totalMilestones}
          />
        </div>

        <MilestoneRecentActivitySection
          logs={recentLogs}
          isLoading={isLoading}
          onAddMilestone={() => openMilestoneSheet()}
        />

        <CareToolsSection className="px-0" palette="soft" />

        <MilestoneLogSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          childId={activeChild.id}
          initialType={initialMilestoneType}
          onLogged={refresh}
        />
      </div>
    </PageBody>
  );
}
