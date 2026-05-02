import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useActiveChild, useChildActions } from "../../contexts/ChildContext";
import { useUpdateChildFeedingTypeAction } from "../../hooks/useSettingsActions";
import { useDbClient } from "../../contexts/DatabaseContext";
import { cn } from "../../lib/cn";
import type { EliminationExperience } from "../../lib/diaper";
import { Button } from "../ui/button";
import { HomeActionBottleIcon, HomeActionBreastfeedIcon, HomeActionDiaperIcon, HomeToolHistoryIcon, PoopIcon } from "../ui/icons";
import { combineLocalDateAndTimeToUtcIso, getAgeInMonthsFromDob, getCurrentLocalDate, getCurrentLocalTime } from "../../lib/utils";

const iconClassName = "h-[1.35rem] w-[1.35rem] md:h-6 md:w-6";

const NAV_ITEMS = [
  {
    path: "/",
    label: "Home",
    matches: (pathname: string) => pathname === "/",
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} className={iconClassName}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    path: "/diaper",
    label: "Diaper",
    matches: (pathname: string) => pathname === "/diaper",
    icon: () => <HomeActionDiaperIcon className={iconClassName} />,
  },
  {
    path: "/feed",
    label: "Feed",
    matches: (pathname: string) => pathname === "/feed",
    icon: () => <HomeActionBottleIcon className={iconClassName} />,
  },
  {
    path: "/sleep",
    label: "Sleep",
    matches: (pathname: string) => pathname === "/sleep",
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} className={iconClassName}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c-.12.64-.21 1.3-.21 2a9 9 0 0 0 10 7.79Z" />
      </svg>
    ),
  },
  {
    path: "/history",
    label: "History",
    matches: (pathname: string) => pathname === "/history",
    icon: () => <HomeToolHistoryIcon className={iconClassName} />,
  },
  {
    path: "/settings",
    label: "Settings",
    matches: (pathname: string) => (
      pathname === "/settings"
      || pathname === "/growth"
      || pathname === "/milestones"
      || pathname === "/guidance"
      || pathname === "/all-kids"
    ),
    icon: (active: boolean) => (
      <>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cn(iconClassName, "md:hidden")}>
          <circle cx="5.5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="18.5" cy="12" r="1.8" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} className={cn(iconClassName, "hidden md:block")}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </>
    ),
  },
];

interface BottomNavProps {
  eliminationExperience: EliminationExperience;
}

export function BottomNav({ eliminationExperience }: BottomNavProps) {
  const db = useDbClient();
  const location = useLocation();
  const navigate = useNavigate();
  const activeChild = useActiveChild();
  const { refreshChildren } = useChildActions();
  const updateChildFeedingType = useUpdateChildFeedingTypeAction(refreshChildren);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showFeedingTransitionConfirm, setShowFeedingTransitionConfirm] = useState(false);
  const [isUpdatingFeedingType, setIsUpdatingFeedingType] = useState(false);

  useEffect(() => {
    const body = document.body;

    const syncSheetState = () => {
      setIsSheetOpen(Number(body.dataset.sheetLockCount ?? "0") > 0);
    };

    syncSheetState();

    const observer = new MutationObserver(syncSheetState);
    observer.observe(body, { attributes: true, attributeFilter: ["data-sheet-lock-count"] });

    return () => observer.disconnect();
  }, []);

  const isBreastOnly = activeChild?.feeding_type === "breast";
  const isFeedingTransitionEligible = isBreastOnly && Boolean(activeChild) && getAgeInMonthsFromDob(activeChild.date_of_birth) >= 6;
  const feedNavPath = isBreastOnly ? "/breastfeed" : "/feed";
  const feedNavLabel = "Feed";

  const navItems = useMemo(
    () => NAV_ITEMS.map((item) => {
      if (item.path === "/diaper") {
        return {
          ...item,
          path: eliminationExperience.route,
          label: eliminationExperience.navLabel,
          matches: (pathname: string) => pathname === "/diaper" || pathname === "/poop",
          icon: (active: boolean) => (
            eliminationExperience.mode === "poop"
              ? <PoopIcon className={cn(iconClassName, active ? "scale-110" : "")} />
              : item.icon(active)
          ),
        };
      }

      if (item.path === "/feed") {
        return {
          ...item,
          path: feedNavPath,
          label: feedNavLabel,
          matches: (pathname: string) => pathname === "/feed" || pathname === "/breastfeed",
          icon: (active: boolean) => (
            isBreastOnly ? (
              <HomeActionBreastfeedIcon className={cn(iconClassName, active ? "scale-110" : "")} />
            ) : item.icon(active)
          ),
        };
      }

      return item;
    }),
    [eliminationExperience.mode, eliminationExperience.navLabel, eliminationExperience.route, feedNavLabel, feedNavPath, isBreastOnly],
  );

  const handleFeedTransitionConfirm = async () => {
    if (!activeChild) return;

    try {
      setIsUpdatingFeedingType(true);
      await db.createMilestoneLog({
        child_id: activeChild.id,
        milestone_type: "started_solids",
        logged_at: combineLocalDateAndTimeToUtcIso(getCurrentLocalDate(), getCurrentLocalTime()),
        notes: null,
      });
      await updateChildFeedingType(activeChild.id, "mixed");
      setShowFeedingTransitionConfirm(false);
      navigate("/feed");
    } finally {
      setIsUpdatingFeedingType(false);
    }
  };

  const handleNavPress = (path: string) => {
    if (
      path === "/breastfeed"
      && isFeedingTransitionEligible
      && location.pathname === "/breastfeed"
    ) {
      setShowFeedingTransitionConfirm(true);
      return;
    }

    navigate(path);
  };

  return (
    <>
      {showFeedingTransitionConfirm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 px-4 pb-[calc(var(--safe-area-bottom)+112px)] pt-10" onClick={() => setShowFeedingTransitionConfirm(false)}>
          <div
            className="w-full max-w-[420px] rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feeding-transition-title"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
              Feeding transition
            </p>
            <h2 id="feeding-transition-title" className="mt-2 text-xl font-semibold text-[var(--color-text)]">
              Switch to mixed feeding?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Your baby is old enough to start trying solids. Confirm this once you want the bottom tab to open the full feed page instead of the breastfeeding timer.
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowFeedingTransitionConfirm(false)}
                disabled={isUpdatingFeedingType}
              >
                Not yet
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={() => void handleFeedTransitionConfirm()}
                disabled={isUpdatingFeedingType}
              >
                {isUpdatingFeedingType ? "Switching..." : "Switch to mixed"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-30 transition-all duration-200 md:px-6",
          "px-3 pb-[calc(var(--safe-area-bottom)+5px)] md:pb-[max(10px,calc(var(--safe-area-bottom)-28px))]",
          isSheetOpen ? "pointer-events-none translate-y-6 opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-[720px] items-center justify-around border border-[var(--color-border)] shadow-[var(--shadow-lg)] backdrop-blur-[20px] md:h-[100px] md:max-w-[860px] md:rounded-[34px]",
            "h-[68px] rounded-[24px] px-1.5",
          )}
          style={{ background: "var(--color-nav-surface)" }}
        >
          {navItems.map((item) => {
            const isActive = item.matches(location.pathname);
            return (
              <button
                key={item.path}
                onClick={() => handleNavPress(item.path)}
                className={cn(
                  "relative flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center transition-all duration-200 md:h-[80px] md:gap-2 md:rounded-[28px]",
                  "h-[56px] gap-1 rounded-[18px]",
                  isActive
                    ? "text-[var(--color-primary)] shadow-[var(--shadow-soft)]"
                    : "text-[var(--color-nav-inactive)] hover:text-[var(--color-nav-inactive-hover)]",
                )}
                style={isActive ? { background: "var(--gradient-nav-active)" } : undefined}
                aria-label={item.label}
              >
                <span
                  className={cn(
                    "absolute left-1/2 top-1.5 hidden h-1 w-8 -translate-x-1/2 rounded-full transition-opacity duration-200",
                    isActive ? "bg-[var(--color-nav-active-indicator)] opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex h-6 w-6 items-center justify-center md:h-7 md:w-7">
                  {item.icon(isActive)}
                </span>
                <span className="max-w-full truncate px-1 text-[0.68rem] font-semibold tracking-[0.01em] md:text-[1rem]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
