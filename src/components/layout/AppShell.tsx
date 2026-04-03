import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [isScrollHeaderVisible, setIsScrollHeaderVisible] = useState(false);
  const headerBackFallbackByPath: Record<string, string> = {
    "/breastfeed": "/",
    "/growth": "/settings",
    "/guidance": "/settings",
    "/handoff": "/settings",
    "/history": "/settings",
    "/milestones": "/settings",
    "/report": "/dashboard",
  };
  const revealOnScrollPaths = new Set(["/poop", "/diaper", "/feed", "/sleep"]);
  const hideHeaderPaths = new Set(["/", "/settings"]);
  const showHeader = !hideHeaderPaths.has(location.pathname);
  const headerFallbackTo = headerBackFallbackByPath[location.pathname];
  const showHeaderBackButton = Boolean(headerFallbackTo);
  const revealHeaderOnScroll = revealOnScrollPaths.has(location.pathname);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

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

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--color-bg)]">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[25]"
        style={{
          height: "calc(var(--safe-area-top) + 26px)",
          background:
            "linear-gradient(180deg, rgba(255,250,243,0.95) 0%, rgba(255,250,243,0.55) 74%, transparent 100%)",
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
        className="relative flex-1 overflow-y-auto overflow-x-hidden pb-24"
        style={{
          paddingTop: showHeader && !revealHeaderOnScroll
            ? "calc(var(--safe-area-top) + 86px)"
            : "var(--safe-area-top)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="mx-auto w-full max-w-[600px]"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
