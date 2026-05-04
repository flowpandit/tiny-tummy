import type { ReactNode } from "react";
import { Avatar } from "../child/Avatar";
import { buildChildProfileSubtitleParts } from "../../lib/child-profile-summary";
import type { Child } from "../../lib/types";

type CompactChildNavProps = {
  activeChild: Child;
  otherChildren: Child[];
  onSelectChild: (childId: string) => void;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
  renderAvatar?: (child: Child, options: { size: "sm"; className: string }) => ReactNode;
  trailing?: ReactNode;
  density?: "default" | "compact";
  profileSubtitleParts?: string[];
};

export function CompactChildNav({
  activeChild,
  otherChildren,
  onSelectChild,
  showBackButton = false,
  onBack,
  className,
  renderAvatar,
  trailing,
  density = "default",
  profileSubtitleParts,
}: CompactChildNavProps) {
  const isCompact = density === "compact";
  const subtitleParts = profileSubtitleParts ?? buildChildProfileSubtitleParts({ child: activeChild });
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
      <div className="flex min-w-0 items-center gap-3">
        {showBackButton && onBack && (
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.02]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <div className={`flex min-w-0 items-center ${isCompact ? "gap-2.5" : "gap-3"}`}>
          {renderChildAvatar(activeChild, `${isCompact ? "h-10 w-10" : "h-14 w-14"} border-2 border-[var(--color-home-card-border)] shadow-[0_10px_24px_rgba(173,126,92,0.14)]`)}
          <div className="min-w-0">
            <p className={`truncate font-semibold leading-tight text-[var(--color-text)] ${isCompact ? "text-[1rem]" : "text-[1.35rem]"}`}>{activeChild.name}</p>
            <div className={`mt-0.5 flex min-w-0 items-center gap-1.5 leading-tight text-[var(--color-text-secondary)] ${isCompact ? "text-[0.78rem]" : "text-[1rem]"}`}>
              {subtitleParts.map((part, index) => (
                <span key={`${part}-${index}`} className="contents">
                  {index > 0 && (
                    <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-soft)]/70" />
                  )}
                  <span className="truncate">{part}</span>
                </span>
              ))}
              {otherChildren.length > 0 && (
                <>
                  {subtitleParts.length > 0 && (
                    <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-soft)]/70" />
                  )}
                  <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-[var(--color-text-soft)]" aria-hidden="true">
                    <path d="m4.5 6.25 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {otherChildren.length > 0 && (
          <>
            {otherChildren.map((child) => (
              <button
                key={child.id}
                type="button"
                aria-label={`Switch to ${child.name}`}
                onClick={() => onSelectChild(child.id)}
                className="rounded-full transition-transform hover:scale-[1.03]"
              >
                {renderChildAvatar(child, `${isCompact ? "h-7 w-7" : "h-8 w-8"} border border-[var(--color-home-card-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]`)}
              </button>
            ))}
          </>
        )}
        {trailing}
      </div>
    </div>
  );
}
