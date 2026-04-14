import type { ReactNode } from "react";
import { Avatar } from "../child/Avatar";
import { getAgeLabelFromDob } from "../../lib/utils";
import type { Child } from "../../lib/types";

type CompactChildNavProps = {
  activeChild: Child;
  otherChildren: Child[];
  onSelectChild: (childId: string) => void;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
  renderAvatar?: (child: Child, options: { size: "sm"; className: string }) => ReactNode;
};

export function CompactChildNav({
  activeChild,
  otherChildren,
  onSelectChild,
  showBackButton = false,
  onBack,
  className,
  renderAvatar,
}: CompactChildNavProps) {
  const renderChildAvatar = (child: Child, className: string) => (
    renderAvatar
      ? renderAvatar(child, { size: "sm", className })
      : (
        <Avatar
          childId={child.id}
          name={child.name}
          color={child.avatar_color}
          size="sm"
          className={className}
        />
      )
  );

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        {showBackButton && onBack && (
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/72 text-[var(--color-text)] shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.02]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-3">
          {renderChildAvatar(activeChild, "h-9 w-9 border-2 border-white/80")}
          <div>
            <p className="text-[0.98rem] font-semibold text-[var(--color-text)]">{activeChild.name}</p>
            <p className="text-[0.76rem] leading-tight text-[var(--color-text-secondary)]">
              {getAgeLabelFromDob(activeChild.date_of_birth)}
            </p>
          </div>
        </div>
      </div>
      {otherChildren.length > 0 && (
        <div className="pointer-events-auto flex items-center gap-2">
          {otherChildren.map((child) => (
            <button
              key={child.id}
              type="button"
              aria-label={`Switch to ${child.name}`}
              onClick={() => onSelectChild(child.id)}
              className="rounded-full transition-transform hover:scale-[1.03]"
            >
              {renderChildAvatar(child, "h-8 w-8 border border-white/80 bg-white/40 shadow-[var(--shadow-soft)]")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
