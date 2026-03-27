import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChildContext } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDietLogs } from "../hooks/useDietLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useAlertEngine } from "../hooks/useAlertEngine";
import { useStats } from "../hooks/useStats";
import { getChildStatus } from "../lib/tauri";
import { timeSince } from "../lib/utils";
import * as db from "../lib/db";
import { ChildSwitcherCard } from "../components/home/ChildSwitcherCard";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
import { WeeklyPatternCard } from "../components/home/WeeklyPatternCard";
import { RecentActivity } from "../components/home/RecentActivity";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { LogForm } from "../components/logging/LogForm";
import { DietLogForm } from "../components/logging/DietLogForm";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { NoLogsYet } from "../components/empty-states/NoLogsYet";
import type { HealthStatus, PoopEntry, DietEntry } from "../lib/types";

export function Home() {
  const { activeChild, children, setActiveChildId } = useChildContext();
  const { logs, lastRealPoop, refresh: refreshLogs } = usePoopLogs(activeChild?.id ?? null);
  const { logs: dietLogs, refresh: refreshDietLogs } = useDietLogs(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { frequency, consistency, colorDist } = useStats(activeChild?.id ?? null, 7);
  const { runChecks } = useAlertEngine();
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [dietFormOpen, setDietFormOpen] = useState(false);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<DietEntry | null>(null);
  const [status, setStatus] = useState<HealthStatus>("healthy");
  const [normalDesc, setNormalDesc] = useState("");
  const [childSwitcherExpanded, setChildSwitcherExpanded] = useState(false);

  useEffect(() => {
    if (!activeChild) return;
    getChildStatus(
      activeChild.date_of_birth,
      activeChild.feeding_type,
      lastRealPoop?.logged_at ?? null,
    ).then(([s, desc]) => {
      setStatus(s);
      setNormalDesc(desc);
    });
  }, [activeChild, lastRealPoop]);

  // Run alert checks on mount, when child changes, and every 30 minutes
  useEffect(() => {
    if (!activeChild) return;

    const check = () => runChecks(activeChild).then(() => refreshAlerts());
    check();

    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeChild, runChecks, refreshAlerts]);

  if (!activeChild) return null;

  const handleLogged = async () => {
    await refreshLogs();
    await runChecks(activeChild);
    await refreshAlerts();
  };

  const handleNoPoop = async () => {
    await db.logNoPoop(activeChild.id);
    refreshLogs();
  };

  const hasLogs = logs.length > 0;
  const lastPoopLabel = lastRealPoop?.logged_at ? timeSince(lastRealPoop.logged_at) : null;

  return (
    <div className="flex flex-col gap-4 pb-3 pt-0.5">
      {/* Alerts */}
      <AlertBanner alerts={alerts} onDismiss={dismiss} />

      {hasLogs ? (
        <>
          <div className="px-3">
            <div className="relative h-[84px]">
              <ChildSwitcherCard
                activeChild={activeChild}
                children={children}
                expanded={childSwitcherExpanded}
                lastPoopLabel={lastPoopLabel}
                onToggle={() => setChildSwitcherExpanded((open) => !open)}
                onSelectChild={(childId) => {
                  setActiveChildId(childId);
                  setChildSwitcherExpanded(false);
                }}
              />

              <AnimatePresence>
                {!childSwitcherExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                  >
                    <div className="h-11 min-w-[182px] max-w-full rounded-full bg-[var(--color-healthy-bg)] px-4 text-center text-[13px] font-semibold text-[var(--color-healthy)] shadow-[var(--shadow-soft)] whitespace-nowrap flex items-center justify-center">
                      {status === "healthy" ? "All looks normal" : status === "caution" ? "Keep an eye on it" : "Pay attention"}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="px-4">
            <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-soft)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-soft)]">
                Time since last poop
              </p>
              <div className="mt-4 flex items-center gap-5">
                <TimeSinceIndicator
                  lastPoopAt={lastRealPoop?.logged_at ?? null}
                  status={status}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[20px] font-semibold leading-tight text-[var(--color-text)]">
                    {status === "healthy"
                      ? `Still in ${activeChild.name}'s usual range`
                      : status === "caution"
                        ? `Still within ${activeChild.name}'s usual range`
                        : `Time to pay closer attention`}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                    Meals, stool type, and color are all easy to review at a glance.
                  </p>
                  <p className="mt-4 text-[12px] text-[var(--color-text-soft)]">{normalDesc}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4">
            <WeeklyPatternCard
              frequency={frequency}
              consistency={consistency}
              colorDist={colorDist}
              poopLogs={logs}
            />
          </div>
        </>
      ) : (
        <NoLogsYet
          childName={activeChild.name}
          onLogFirst={() => setLogFormOpen(true)}
        />
      )}

      {/* CTA Buttons */}
      <div className="px-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setLogFormOpen(true)}
            className="rounded-full bg-[var(--color-cta)] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[var(--shadow-medium)] transition-colors hover:bg-[var(--color-cta-hover)]"
          >
            Log Poop
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setDietFormOpen(true)}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-5 py-3.5 text-[15px] font-semibold text-[var(--color-text)] shadow-[var(--shadow-soft)] transition-colors hover:bg-white/70"
          >
            Log Meal
          </motion.button>
        </div>
        <div className="mt-3 flex justify-center">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleNoPoop}
            className="text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
          >
            Mark no-poop day
          </motion.button>
        </div>
      </div>

      {/* Recent activity */}
      {(logs.length > 0 || dietLogs.length > 0) && (
        <RecentActivity
          poopLogs={logs}
          dietLogs={dietLogs}
          onEditPoop={setEditingPoop}
          onEditMeal={setEditingMeal}
        />
      )}

      {/* Log form sheet */}
      <LogForm
        open={logFormOpen}
        onClose={() => setLogFormOpen(false)}
        childId={activeChild.id}
        onLogged={handleLogged}
      />

      {/* Diet log form sheet */}
      <DietLogForm
        open={dietFormOpen}
        onClose={() => setDietFormOpen(false)}
        childId={activeChild.id}
        onLogged={refreshDietLogs}
      />

      {/* Edit sheets */}
      {editingPoop && (
        <EditPoopSheet
          key={editingPoop.id}
          entry={editingPoop}
          open={!!editingPoop}
          onClose={() => setEditingPoop(null)}
          onSaved={() => { refreshLogs(); refreshDietLogs(); }}
          onDeleted={() => { refreshLogs(); refreshDietLogs(); }}
        />
      )}
      {editingMeal && (
        <EditMealSheet
          key={editingMeal.id}
          entry={editingMeal}
          open={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onSaved={() => { refreshLogs(); refreshDietLogs(); }}
          onDeleted={() => { refreshLogs(); refreshDietLogs(); }}
        />
      )}
    </div>
  );
}
