import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useChildContext } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDietLogs } from "../hooks/useDietLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useAlertEngine } from "../hooks/useAlertEngine";
import { getChildStatus } from "../lib/tauri";
import * as db from "../lib/db";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
import { StatusCard } from "../components/home/StatusCard";
import { RecentActivity } from "../components/home/RecentActivity";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { LogForm } from "../components/logging/LogForm";
import { DietLogForm } from "../components/logging/DietLogForm";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { NoLogsYet } from "../components/empty-states/NoLogsYet";
import type { HealthStatus, PoopEntry, DietEntry } from "../lib/types";

export function Home() {
  const { activeChild } = useChildContext();
  const { logs, lastRealPoop, refresh: refreshLogs } = usePoopLogs(activeChild?.id ?? null);
  const { logs: dietLogs, refresh: refreshDietLogs } = useDietLogs(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { runChecks } = useAlertEngine();
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [dietFormOpen, setDietFormOpen] = useState(false);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<DietEntry | null>(null);
  const [status, setStatus] = useState<HealthStatus>("healthy");
  const [normalDesc, setNormalDesc] = useState("");

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

  return (
    <div className="flex flex-col gap-5 py-5">
      {/* Alerts */}
      <AlertBanner alerts={alerts} onDismiss={dismiss} />

      {hasLogs ? (
        <>
          {/* Time since indicator ring */}
          <div className="px-4">
            <TimeSinceIndicator
              lastPoopAt={lastRealPoop?.logged_at ?? null}
              status={status}
            />
          </div>

          {/* Status card */}
          <StatusCard
            status={status}
            normalDescription={normalDesc}
            childName={activeChild.name}
            lastPoopAt={lastRealPoop?.logged_at ?? null}
          />
        </>
      ) : (
        <NoLogsYet
          childName={activeChild.name}
          onLogFirst={() => setLogFormOpen(true)}
        />
      )}

      {/* CTA Buttons */}
      <div className="flex flex-col items-center gap-3 px-4">
        {/* Big Log Poop button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setLogFormOpen(true)}
          className="w-20 h-20 rounded-full bg-[var(--color-cta)] text-white shadow-[var(--shadow-medium)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-cta-hover)] transition-colors"
          aria-label="Log poop"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
          </svg>
        </motion.button>
        <span className="text-sm font-medium text-[var(--color-text)]">Log Poop</span>

        {/* Secondary actions */}
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleNoPoop}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer py-2 px-4 rounded-[var(--radius-md)] hover:bg-[var(--color-bg)] transition-colors border border-[var(--color-border)]"
          >
            No poop today
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setDietFormOpen(true)}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer py-2 px-4 rounded-[var(--radius-md)] hover:bg-[var(--color-bg)] transition-colors border border-[var(--color-border)]"
          >
            Log Meal
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
