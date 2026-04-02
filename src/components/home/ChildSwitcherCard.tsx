import { type KeyboardEvent, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../child/Avatar";
import { getAgeLabelFromDob } from "../../lib/utils";
import type { Child } from "../../lib/types";

interface ChildSwitcherCardProps {
  activeChild: Child;
  children: Child[];
  expanded: boolean;
  secondaryLabel: string | null;
  collapsible?: boolean;
  onToggle?: () => void;
  onSelectChild: (id: string) => void;
}

export function ChildSwitcherCard({
  activeChild,
  children,
  expanded,
  secondaryLabel,
  collapsible = true,
  onToggle,
  onSelectChild,
}: ChildSwitcherCardProps) {
  const navigate = useNavigate();
  const ageLabel = getAgeLabelFromDob(activeChild.date_of_birth);
  const otherChildren = children.filter((child) => child.id !== activeChild.id);
  const isExpanded = collapsible ? expanded : true;

  const handleKeyToggle = (event: KeyboardEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (!collapsible || !onToggle) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  const handleAddChild = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate("/add-child");
  };

  const handleSelectChild = (event: MouseEvent<HTMLButtonElement>, childId: string) => {
    event.stopPropagation();
    onSelectChild(childId);
  };

  return (
    <div
      role={collapsible ? "button" : undefined}
      tabIndex={collapsible ? 0 : undefined}
      onClick={collapsible ? onToggle : undefined}
      onKeyDown={collapsible ? handleKeyToggle : undefined}
      className="relative w-full"
      style={{ height: "84px" }}
    >
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{
          width: isExpanded || !collapsible ? "100%" : 88,
          opacity: isExpanded || !collapsible ? 1 : 0,
        }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-y-0 left-0 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] shadow-[var(--shadow-soft)]"
      />

      <div className="relative z-10 flex h-full items-center">
        <Avatar
          childId={activeChild.id}
          name={activeChild.name}
          color={activeChild.avatar_color}
          size="lg"
          className="ml-7 h-[56px] w-[56px] ring-4 ring-white/55 text-[1.4rem]"
        />

        <motion.div
          initial={false}
          animate={{
            opacity: isExpanded ? 1 : 0,
            x: isExpanded ? 0 : -10,
          }}
          transition={{ duration: collapsible ? 0.1 : 0, ease: "easeOut" }}
          className="ml-5 min-w-0 flex-1"
          style={{ pointerEvents: isExpanded ? "auto" : "none" }}
        >
          <p className="truncate text-[24px] font-semibold leading-none text-[var(--color-text)]">
            {activeChild.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-text-secondary)]">
            <span>{ageLabel}</span>
            {secondaryLabel && (
              <>
                <span className="h-2 w-2 rounded-full bg-[var(--color-healthy)]" />
                <span className="text-[var(--color-healthy)]">{secondaryLabel}</span>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            opacity: isExpanded ? 1 : 0,
            x: isExpanded ? 0 : 14,
          }}
          transition={{ duration: collapsible ? 0.1 : 0, ease: "easeOut" }}
          className="mr-5 flex items-center gap-2"
          style={{ pointerEvents: isExpanded ? "auto" : "none" }}
        >
          {otherChildren.map((child) => (
            <button
              key={child.id}
              type="button"
              aria-label={`Switch to ${child.name}`}
              onClick={(event) => handleSelectChild(event, child.id)}
              className="rounded-full transition-transform hover:scale-[1.03]"
            >
              <Avatar
                childId={child.id}
                name={child.name}
                color={child.avatar_color}
                size="sm"
                className="h-9 w-9 ring-2 ring-white/60 text-sm"
              />
            </button>
          ))}

          <button
            type="button"
            aria-label="Add a child"
            onClick={handleAddChild}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/70 text-[30px] font-light leading-none text-[var(--color-text-secondary)] transition-colors hover:bg-white"
          >
            +
          </button>
        </motion.div>
      </div>
    </div>
  );
}
