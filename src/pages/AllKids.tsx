import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useChildActions, useChildren } from "../contexts/ChildContext";
import { useDbClient } from "../contexts/DatabaseContext";
import { getChildStatus } from "../lib/tauri";
import { getAgeLabelFromDob, timeSince } from "../lib/utils";
import { Card, CardContent } from "../components/ui/card";
import { Avatar } from "../components/child/Avatar";
import { Badge } from "../components/ui/badge";
import { Header } from "../components/layout/Header";
import type { Child, HealthStatus } from "../lib/types";

interface ChildSummary {
  child: Child;
  status: HealthStatus;
  lastPoopLabel: string | null;
  alertCount: number;
}

export function AllKids() {
  const db = useDbClient();
  const children = useChildren();
  const { setActiveChildId } = useChildActions();
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<ChildSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setIsLoading(true);
      setSummaries([]);

      const results = await Promise.all(
        children.map(async (child) => {
          const lastPoop = await db.getLastRealPoop(child.id);
          const lastAt = lastPoop?.logged_at ?? null;
          const [status] = await getChildStatus(
            child.date_of_birth,
            child.feeding_type,
            lastAt,
          );
          const alerts = await db.getActiveAlerts(child.id);
          return {
            child,
            status,
            lastPoopLabel: lastAt ? timeSince(lastAt) : null,
            alertCount: alerts.length,
          };
        }),
      );

      if (!cancelled) {
        setSummaries(results);
        setIsLoading(false);
      }
    }

    void loadAll();

    return () => {
      cancelled = true;
    };
  }, [children]);

  const handleSelectChild = (childId: string) => {
    setActiveChildId(childId);
    navigate("/");
  };

  const statusColor: Record<HealthStatus, string> = {
    healthy: "var(--color-healthy)",
    caution: "var(--color-caution)",
    alert: "var(--color-alert)",
    unknown: "var(--color-muted)",
  };

  const statusLabel: Record<HealthStatus, string> = {
    healthy: "All good",
    caution: "Keep watching",
    alert: "Needs attention",
    unknown: "No data yet",
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-6" style={{ paddingTop: "calc(var(--safe-area-top) + 94px)" }}>
      <Header showBackButton fallbackTo="/settings" />

      <h2 className="text-2xl font-bold text-[var(--color-text)] mb-1">
        All Kids
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Overview of all your children at a glance.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {summaries.map((summary, i) => (
            <motion.div
              key={summary.child.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelectChild(summary.child.id); }}
                className="cursor-pointer hover:shadow-[var(--shadow-medium)] transition-shadow duration-200 border-l-[3px]"
                style={{ borderLeftColor: statusColor[summary.status] }}
                onClick={() => handleSelectChild(summary.child.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <Avatar childId={summary.child.id} name={summary.child.name} color={summary.child.avatar_color} size="lg" />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-[var(--color-text)] truncate">
                          {summary.child.name}
                        </p>
                        {summary.alertCount > 0 && (
                          <Badge variant="alert">{summary.alertCount} alert{summary.alertCount > 1 ? "s" : ""}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {getAgeLabelFromDob(summary.child.date_of_birth)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: statusColor[summary.status] }}
                        />
                        <span className="text-xs" style={{ color: statusColor[summary.status] }}>
                          {statusLabel[summary.status]}
                        </span>
                        {summary.lastPoopLabel && (
                          <>
                            <span className="text-xs text-[var(--color-muted)]">·</span>
                            <span className="text-xs text-[var(--color-muted)]">
                              Last poop: {summary.lastPoopLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-5 h-5 flex-shrink-0">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Add child button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: summaries.length * 0.05 }}
            onClick={() => navigate("/add-child")}
            className="flex items-center justify-center gap-2 py-4 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add another child
          </motion.button>
        </div>
      )}
    </div>
  );
}
