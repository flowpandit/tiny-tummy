import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getGuidanceTips } from "../lib/tauri";
import { Card, CardContent } from "../components/ui/card";
import { cn } from "../lib/cn";
import type { GuidanceTip } from "../lib/types";

function TipCard({ tip }: { tip: GuidanceTip }) {
  const [expanded, setExpanded] = useState(false);

  const borderColor =
    tip.severity === "urgent"
      ? "var(--color-alert)"
      : tip.severity === "caution"
        ? "var(--color-caution)"
        : "var(--color-info)";

  const iconColor =
    tip.severity === "urgent"
      ? "var(--color-alert)"
      : tip.severity === "caution"
        ? "var(--color-caution)"
        : "var(--color-info)";

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}
      className="border-l-[3px] cursor-pointer transition-shadow duration-200 hover:shadow-[var(--shadow-soft)]"
      style={{ borderLeftColor: borderColor }}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--color-text)]">
            {tip.title}
          </p>
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill={iconColor}
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </motion.svg>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line mt-2 pt-2 border-t border-[var(--color-border)]">
                {tip.body}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

const ALL_FILTER = "All";

export function Guidance() {
  const [tips, setTips] = useState<GuidanceTip[]>([]);
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);

  useEffect(() => {
    getGuidanceTips().then(setTips);
  }, []);

  const categories = [...new Set(tips.map((t) => t.category))];
  const filters = [ALL_FILTER, ...categories];

  // "When to Call the Doctor" always first
  const sortedCategories =
    activeFilter !== ALL_FILTER
      ? [activeFilter]
      : [
          ...categories.filter((c) => c === "When to Call the Doctor"),
          ...categories.filter((c) => c !== "When to Call the Doctor"),
        ];

  const filteredTips =
    activeFilter === ALL_FILTER
      ? tips
      : tips.filter((t) => t.category === activeFilter);

  return (
    <div className="px-4 py-5">
      <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--color-text)] mb-2">
        Guidance
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-4">
        Tap a card to read more. Always consult your pediatrician for specific medical advice.
      </p>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-none">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-[var(--radius-full)] text-xs font-medium cursor-pointer transition-colors duration-200",
              activeFilter === filter
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-muted)]",
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Tips grouped by category */}
      {sortedCategories.map((cat) => {
        const catTips = filteredTips.filter((t) => t.category === cat);
        if (catTips.length === 0) return null;

        return (
          <div key={cat} className="mb-5">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              {cat}
            </h3>
            <div className="flex flex-col gap-2">
              {catTips.map((tip) => (
                <TipCard key={tip.id} tip={tip} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
