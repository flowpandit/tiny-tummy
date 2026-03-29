import { useEffect, useState } from "react";
import { useChildContext } from "../../contexts/ChildContext";
import { timeSince } from "../../lib/utils";
import { getLastRealPoop } from "../../lib/db";
import { ChildSwitcherCard } from "../home/ChildSwitcherCard";

export function Header() {
  const { activeChild, children, setActiveChildId } = useChildContext();
  const [lastPoopLabel, setLastPoopLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!activeChild) return;

    let cancelled = false;

    async function load() {
      const lastPoop = await getLastRealPoop(activeChild!.id);
      const lastAt = lastPoop?.logged_at ?? null;
      if (cancelled) return;
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
    <header
      className="fixed top-0 left-0 right-0 z-20 px-4"
      style={{ paddingTop: "calc(var(--safe-area-top) + 16px)" }}
    >
      <div className="mx-auto max-w-[560px]">
        <ChildSwitcherCard
          activeChild={activeChild}
          children={children}
          expanded
          collapsible={false}
          lastPoopLabel={lastPoopLabel}
          onSelectChild={setActiveChildId}
        />
      </div>
    </header>
  );
}
