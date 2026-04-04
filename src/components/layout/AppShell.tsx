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

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeChild } = useChildContext();
  const { experience } = useEliminationPreference(activeChild);
  const mainRef = useRef<HTMLElement | null>(null);
  const [isScrollHeaderVisible, setIsScrollHeaderVisible] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [pendingSwipePath, setPendingSwipePath] = useState<string | null>(null);
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lockedAxis: "x" | "y" | null;
    isEligible: boolean;
  } | null>(null);
  const previousPathRef = useRef(location.pathname);
  const swipeNavigateTimeoutRef = useRef<number | null>(null);
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
  const previewPath = dragOffsetX < 0 ? bottomNavPaths[swipeRouteIndex + 1] ?? null : dragOffsetX > 0 ? bottomNavPaths[swipeRouteIndex - 1] ?? null : null;
  const previewMeta = previewPath ? bottomNavMeta[previewPath] : null;
  const dragProgress = Math.min(Math.abs(dragOffsetX) / 180, 1);
  const contentShadowOpacity = Math.min(Math.abs(dragOffsetX) / 240, 0.14);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
    setDragOffsetX(0);
    setPendingSwipePath(null);
  }, [location.pathname]);

  useEffect(() => () => {
    if (swipeNavigateTimeoutRef.current !== null) {
      window.clearTimeout(swipeNavigateTimeoutRef.current);
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

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lockedAxis: null,
      isEligible: true,
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
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    gestureRef.current = null;

    if (!gesture.isEligible || gesture.lockedAxis !== "x") {
      setDragOffsetX(0);
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE || Math.abs(deltaX) <= Math.abs(deltaY)) {
      setDragOffsetX(0);
      return;
    }

    const targetPath = deltaX < 0 ? getSwipeTarget("next") : getSwipeTarget("previous");
    if (!targetPath || targetPath === location.pathname) {
      setDragOffsetX(0);
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
              animate={{ x: dragOffsetX }}
              transition={gestureRef.current?.lockedAxis === "x"
                ? { duration: 0 }
                : pendingSwipePath
                    ? { duration: isIOS ? 0.18 : 0.21, ease: [0.22, 1, 0.36, 1] }
                    : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{
                boxShadow: dragOffsetX === 0 ? "none" : `0 20px 50px rgba(120, 92, 69, ${contentShadowOpacity})`,
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
