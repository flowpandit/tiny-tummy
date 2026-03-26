import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChildContext } from "../../contexts/ChildContext";
import { getAgeLabelFromDob, timeSince } from "../../lib/utils";
import { getChildStatus } from "../../lib/tauri";
import { getLastRealPoop } from "../../lib/db";
import { cn } from "../../lib/cn";
import { Avatar } from "../child/Avatar";
import type { HealthStatus } from "../../lib/types";

const STATUS_DOT_COLOR: Record<HealthStatus, string> = {
  healthy: "var(--color-healthy)",
  caution: "var(--color-caution)",
  alert: "var(--color-alert)",
  unknown: "var(--color-muted)",
};

export function Header() {
  const { activeChild, children, setActiveChildId } = useChildContext();
  const navigate = useNavigate();
  const [lastPoopLabel, setLastPoopLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<HealthStatus>("unknown");

  useEffect(() => {
    if (!activeChild) return;

    let cancelled = false;

    async function load() {
      const lastPoop = await getLastRealPoop(activeChild!.id);
      const lastAt = lastPoop?.logged_at ?? null;
      const [s] = await getChildStatus(
        activeChild!.date_of_birth,
        activeChild!.feeding_type,
        lastAt,
      );
      if (cancelled) return;
      setStatus(s);
      setLastPoopLabel(lastAt ? timeSince(lastAt) : null);
    }

    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeChild]);

  if (!activeChild) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3" style={{ paddingTop: "calc(var(--safe-area-top) + 8px)" }}>
      <div className="flex items-center justify-between">
        {/* Active child info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar childId={activeChild.id} name={activeChild.name} color={activeChild.avatar_color} size="sm" />
          <div className="min-w-0">
            <h1 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)] leading-tight truncate">
              {activeChild.name}
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[var(--color-text-secondary)]">
                {getAgeLabelFromDob(activeChild.date_of_birth)}
              </p>
              {lastPoopLabel && (
                <>
                  <span className="text-xs text-[var(--color-muted)]">·</span>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: STATUS_DOT_COLOR[status] }}
                    />
                    <span className="text-xs" style={{ color: STATUS_DOT_COLOR[status] }}>
                      {lastPoopLabel}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Child switcher avatars + add button */}
        <div className="flex items-center gap-1.5 ml-3">
          {children.length > 1 &&
            children
              .filter((c) => c.id !== activeChild.id)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChildId(c.id)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                  aria-label={`Switch to ${c.name}`}
                  title={c.name}
                >
                  <Avatar childId={c.id} name={c.name} color={c.avatar_color} size="xs" />
                </button>
              ))}
          {/* Add child button */}
          <button
            onClick={() => navigate("/add-child")}
            className={cn(
              "w-9 h-9 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center cursor-pointer transition-colors",
              "border-2 border-dashed border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
            )}
            aria-label="Add child"
            title="Add child"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
