import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useChildContext } from "../../contexts/ChildContext";
import { useEliminationPreference } from "../../hooks/useEliminationPreference";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

const pageVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction === 0 ? 0 : direction > 0 ? 28 : -28,
  }),
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction === 0 ? 0 : direction > 0 ? -28 : 28,
  }),
};

const SWIPE_MIN_DISTANCE = 72;
const SWIPE_DIRECTION_LOCK_RATIO = 1.2;
const PULL_REFRESH_TRIGGER = 92;
const PULL_REFRESH_MAX = 128;
const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='slider']",
  "[data-no-page-swipe='true']",
].join(", ");

function applyEdgeResistance(offset: number, hasTarget: boolean) {
  if (hasTarget) return offset;
  return Math.sign(offset) * Math.pow(Math.abs(offset), 0.82) * 0.22;
}

function applyPullResistance(offset: number) {
  return Math.min(PULL_REFRESH_MAX, Math.pow(Math.max(offset, 0), 0.82) * 0.88);
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeChild } = useChildContext();
  const { experience } = useEliminationPreference(activeChild);
  const mainRef = useRef<HTMLElement | null>(null);
  const [isScrollHeaderVisible, setIsScrollHeaderVisible] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [pullOffsetY, setPullOffsetY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSwipePath, setPendingSwipePath] = useState<string | null>(null);
  const touchPullRef = useRef<{
    startY: number;
    isEligible: boolean;
  } | null>(null);
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lockedAxis: "x" | "y" | null;
    isEligible: boolean;
    canPullToRefresh: boolean;
  } | null>(null);
  const previousPathRef = useRef(location.pathname);
  const swipeNavigateTimeoutRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const isIOS = typeof window !== "undefined" && (
    /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
  const headerBackFallbackByPath: Record<string, string> = {
    "/breastfeed": "/",
    "/growth": "/settings",
    "/guidance": "/settings",
    "/handoff": "/settings",
    "/history": "/settings",
    "/milestones": "/settings",
    "/report": "/dashboard",
  };
  const revealOnScrollPaths = new Set(["/poop", "/diaper", "/feed", "/sleep", "/breastfeed", "/growth"]);
  const hideHeaderPaths = new Set(["/", "/settings"]);
  const showHeader = !hideHeaderPaths.has(location.pathname);
  const headerFallbackTo = headerBackFallbackByPath[location.pathname];
  const showHeaderBackButton = Boolean(headerFallbackTo);
  const revealHeaderOnScroll = revealOnScrollPaths.has(location.pathname);
  const bottomNavPaths = useMemo(
    () => ["/", experience.route, "/dashboard", "/feed", "/sleep", "/settings"],
    [experience.route],
  );
  const bottomNavMeta = useMemo<Record<string, { label: string; eyebrow: string; description: string }>>(
    () => ({
      "/": {
        label: "Home",
        eyebrow: "Today",
        description: "Return to the daily overview and quick actions.",
      },
      [experience.route]: {
        label: experience.navLabel,
        eyebrow: "Log",
        description: `Jump to ${experience.navLabel.toLowerCase()} tracking.`,
      },
      "/dashboard": {
        label: "Trend",
        eyebrow: "Patterns",
        description: "Review frequency, consistency, and correlation trends.",
      },
      "/feed": {
        label: "Feed",
        eyebrow: "Meals",
        description: "Open feeding history and meal logging.",
      },
      "/sleep": {
        label: "Sleep",
        eyebrow: "Rest",
        description: "Check naps, overnight sleep, and totals.",
      },
      "/settings": {
        label: "Settings",
        eyebrow: "More",
        description: "Open reports, growth, milestones, and preferences.",
      },
    }),
    [experience.navLabel, experience.route],
  );
  const swipeRouteIndex = bottomNavPaths.indexOf(location.pathname);
  const canSwipeBetweenBottomRoutes = swipeRouteIndex !== -1;
  const canPullToRefresh = canSwipeBetweenBottomRoutes && !pendingSwipePath && !isRefreshing;
  const previewPath = dragOffsetX < 0 ? bottomNavPaths[swipeRouteIndex + 1] ?? null : dragOffsetX > 0 ? bottomNavPaths[swipeRouteIndex - 1] ?? null : null;
  const previewMeta = previewPath ? bottomNavMeta[previewPath] : null;
  const dragProgress = Math.min(Math.abs(dragOffsetX) / 180, 1);
  const contentShadowOpacity = Math.min(Math.abs(dragOffsetX) / 240, 0.14);
  const pullProgress = Math.min(pullOffsetY / PULL_REFRESH_TRIGGER, 1);
  const contentTransition = gestureRef.current?.lockedAxis === "x"
    ? { duration: 0 }
    : gestureRef.current?.lockedAxis === "y" && !isRefreshing
        ? { duration: 0 }
        : isRefreshing
            ? { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const }
            : pendingSwipePath
                ? { duration: isIOS ? 0.18 : 0.21, ease: [0.22, 1, 0.36, 1] as const }
                : { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
    setDragOffsetX(0);
    setPullOffsetY(0);
    setIsRefreshing(false);
    setPendingSwipePath(null);
  }, [location.pathname]);

  useEffect(() => () => {
    if (swipeNavigateTimeoutRef.current !== null) {
      window.clearTimeout(swipeNavigateTimeoutRef.current);
    }
    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const previousIndex = bottomNavPaths.indexOf(previousPath);
    const nextIndex = bottomNavPaths.indexOf(location.pathname);

    if (previousIndex !== -1 && nextIndex !== -1 && previousIndex !== nextIndex) {
      setTransitionDirection(nextIndex > previousIndex ? 1 : -1);
    } else {
      setTransitionDirection(0);
    }

    previousPathRef.current = location.pathname;
  }, [bottomNavPaths, location.pathname]);

  useEffect(() => {
    if (!showHeader) {
      setIsScrollHeaderVisible(false);
      return;
    }

    if (!revealHeaderOnScroll) {
      setIsScrollHeaderVisible(true);
      return;
    }

    const scrollRoot = mainRef.current;
    if (!scrollRoot) return;

    const revealThreshold = 170;
    const updateVisibility = () => {
      setIsScrollHeaderVisible(scrollRoot.scrollTop > revealThreshold);
    };

    updateVisibility();
    scrollRoot.addEventListener("scroll", updateVisibility, { passive: true });

    return () => {
      scrollRoot.removeEventListener("scroll", updateVisibility);
    };
  }, [location.pathname, revealHeaderOnScroll, showHeader]);

  const getSwipeTarget = (direction: "previous" | "next") => {
    if (!canSwipeBetweenBottomRoutes) return null;

    const targetIndex = direction === "previous" ? swipeRouteIndex - 1 : swipeRouteIndex + 1;
    return bottomNavPaths[targetIndex] ?? null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!canSwipeBetweenBottomRoutes || event.pointerType === "mouse" || pendingSwipePath) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    const scrollRoot = mainRef.current;
    const atTop = scrollRoot ? scrollRoot.scrollTop <= 0 : false;

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lockedAxis: null,
      isEligible: true,
      canPullToRefresh: canPullToRefresh && atTop,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !gesture.isEligible) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (!gesture.lockedAxis) {
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;

      if (Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_DIRECTION_LOCK_RATIO) {
        gesture.lockedAxis = "x";
      } else if (Math.abs(deltaY) > Math.abs(deltaX) * SWIPE_DIRECTION_LOCK_RATIO) {
        gesture.lockedAxis = "y";
      } else {
        return;
      }
    }

    if (gesture.lockedAxis === "x") {
      const nextOffset = Math.max(-window.innerWidth * 0.72, Math.min(deltaX, window.innerWidth * 0.72));
      const targetExists = nextOffset < 0 ? Boolean(getSwipeTarget("next")) : Boolean(getSwipeTarget("previous"));
      setDragOffsetX(applyEdgeResistance(nextOffset, targetExists));
      event.preventDefault();
      return;
    }

    if (gesture.lockedAxis === "y" && gesture.canPullToRefresh && deltaY > 0) {
      setPullOffsetY(applyPullResistance(deltaY));
      event.preventDefault();
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    gestureRef.current = null;

    if (!gesture.isEligible) {
      setDragOffsetX(0);
      setPullOffsetY(0);
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (gesture.lockedAxis === "y") {
      if (gesture.canPullToRefresh && pullOffsetY >= PULL_REFRESH_TRIGGER) {
        setIsRefreshing(true);
        setPullOffsetY(62);
        refreshTimeoutRef.current = window.setTimeout(() => {
          refreshTimeoutRef.current = null;
          window.location.reload();
        }, 420);
      } else {
        setPullOffsetY(0);
      }
      return;
    }

    if (gesture.lockedAxis !== "x") {
      setDragOffsetX(0);
      setPullOffsetY(0);
      return;
    }

    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE || Math.abs(deltaX) <= Math.abs(deltaY)) {
      setDragOffsetX(0);
      setPullOffsetY(0);
      return;
    }

    const targetPath = deltaX < 0 ? getSwipeTarget("next") : getSwipeTarget("previous");
    if (!targetPath || targetPath === location.pathname) {
      setDragOffsetX(0);
      setPullOffsetY(0);
      return;
    }

    const exitOffset = deltaX < 0 ? -window.innerWidth : window.innerWidth;
    setPendingSwipePath(targetPath);
    setDragOffsetX(exitOffset);
    swipeNavigateTimeoutRef.current = window.setTimeout(() => {
      swipeNavigateTimeoutRef.current = null;
      navigate(targetPath);
    }, isIOS ? 180 : 210);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (!canPullToRefresh || pendingSwipePath) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(INTERACTIVE_SELECTOR)) return;

    const scrollRoot = mainRef.current;
    const atTop = scrollRoot ? scrollRoot.scrollTop <= 0 : false;
    if (!atTop) return;

    touchPullRef.current = {
      startY: event.touches[0]?.clientY ?? 0,
      isEligible: true,
    };
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const touchPull = touchPullRef.current;
    if (!touchPull || !touchPull.isEligible || isRefreshing || pendingSwipePath) return;

    const currentY = event.touches[0]?.clientY ?? touchPull.startY;
    const deltaY = currentY - touchPull.startY;
    if (deltaY <= 0) {
      setPullOffsetY(0);
      return;
    }

    setPullOffsetY(applyPullResistance(deltaY));
    event.preventDefault();
  };

  const handleTouchEnd = () => {
    const touchPull = touchPullRef.current;
    touchPullRef.current = null;
    if (!touchPull?.isEligible || pendingSwipePath) return;

    if (pullOffsetY >= PULL_REFRESH_TRIGGER) {
      setIsRefreshing(true);
      setPullOffsetY(62);
      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        window.location.reload();
      }, 420);
      return;
    }

    setPullOffsetY(0);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--color-bg)]">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[25]"
        style={{
          height: "calc(var(--safe-area-top) + 26px)",
          background: "var(--gradient-shell-top-overlay)",
          backdropFilter: "blur(24px) saturate(1.02)",
          WebkitBackdropFilter: "blur(24px) saturate(1.02)",
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[300px]" style={{ background: "var(--gradient-sunrise)" }} />
        <div className="absolute -left-12 top-20 h-56 w-56 rounded-full bg-[var(--color-peach)]/26 blur-3xl" />
        <div className="absolute right-[-64px] top-16 h-64 w-64 rounded-full bg-[var(--color-dawn)]/38 blur-3xl" />
        <div className="absolute right-[-72px] top-52 h-64 w-64 rounded-full bg-[var(--color-apricot)]/14 blur-3xl" />
        <div className="absolute bottom-20 left-[-44px] h-52 w-52 rounded-full bg-[var(--color-sky-wash)]/22 blur-3xl" />
      </div>
      {showHeader && (
        <Header
          showBackButton={showHeaderBackButton}
          fallbackTo={headerFallbackTo}
          visible={isScrollHeaderVisible}
        />
      )}
      <main
        ref={mainRef}
        data-scroll-root="true"
        className="relative flex-1 overflow-y-auto overflow-x-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          overscrollBehavior: "none",
          WebkitOverflowScrolling: "touch",
          touchAction: canSwipeBetweenBottomRoutes ? "pan-y" : "auto",
          paddingBottom: "calc(var(--safe-area-bottom) + 96px)",
          paddingTop: showHeader && !revealHeaderOnScroll
            ? "calc(var(--safe-area-top) + 86px)"
            : "var(--safe-area-top)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
          style={{
            paddingTop: "calc(var(--safe-area-top) + 10px)",
            opacity: pullOffsetY > 0 || isRefreshing ? 1 : 0,
            transform: `translate3d(0, ${Math.max(0, pullOffsetY - 52)}px, 0)`,
            transition: pullOffsetY > 0 && !isRefreshing ? "none" : "opacity 180ms var(--ease-out-soft), transform 180ms var(--ease-out-soft)",
          }}
        >
          <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/92 px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur-[18px]">
            <div
              className={isRefreshing ? "animate-spin" : ""}
              style={{
                transform: isRefreshing ? undefined : `rotate(${pullProgress * 180}deg)`,
                transition: pullOffsetY > 0 ? "none" : "transform 180ms var(--ease-out-soft)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-[var(--color-primary)]">
                <path
                  d="M15.833 10a5.833 5.833 0 1 1-1.709-4.124"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.833 4.167v2.916h-2.916"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {isRefreshing ? "Refreshing" : pullProgress >= 1 ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        </div>
        {previewMeta && (
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div
              className="absolute inset-y-0 w-[78%] max-w-[420px]"
              style={{
                [dragOffsetX < 0 ? "right" : "left"]: 0,
                opacity: 0.28 + dragProgress * 0.72,
                transform: `translate3d(${dragOffsetX < 0 ? 44 - dragProgress * 44 : -44 + dragProgress * 44}px, 0, 0)`,
              }}
            >
              <div
                className="flex h-full flex-col justify-center px-6"
                style={{
                  background: dragOffsetX < 0
                    ? "linear-gradient(270deg, rgba(255,247,238,0.96) 0%, rgba(255,251,244,0.62) 58%, rgba(255,251,244,0) 100%)"
                    : "linear-gradient(90deg, rgba(255,247,238,0.96) 0%, rgba(255,251,244,0.62) 58%, rgba(255,251,244,0) 100%)",
                }}
              >
                <div className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)]/92 p-6 shadow-[var(--shadow-medium)] backdrop-blur-[18px]">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">{previewMeta.eyebrow}</p>
                  <p className="mt-3 font-[var(--font-display)] text-[2rem] font-semibold leading-[0.96] tracking-[-0.04em] text-[var(--color-text)]">
                    {previewMeta.label}
                  </p>
                  <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {previewMeta.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[var(--color-cta)]" />
                    <div className="h-[1px] flex-1 bg-[var(--color-border)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            custom={transitionDirection}
            className="relative z-10 mx-auto w-full max-w-[1180px]"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: isIOS ? 0.2 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={{ x: dragOffsetX, y: pullOffsetY }}
              transition={contentTransition}
              style={{
                boxShadow: dragOffsetX === 0 && pullOffsetY === 0
                  ? "none"
                  : `0 20px 50px rgba(120, 92, 69, ${Math.max(contentShadowOpacity, Math.min(pullOffsetY / 420, 0.12))})`,
              }}
            >
              <Outlet />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
