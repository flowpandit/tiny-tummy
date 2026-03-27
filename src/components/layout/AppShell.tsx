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
  const hideHeaderPaths = new Set(["/", "/guidance", "/settings"]);
  const showHeader = !hideHeaderPaths.has(location.pathname);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--color-bg)]">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[25]"
        style={{
          height: "calc(var(--safe-area-top) + 14px)",
          background:
            "linear-gradient(180deg, var(--color-surface-strong) 0%, var(--color-surface) 72%, transparent 100%)",
          backdropFilter: "blur(18px) saturate(1.08)",
          WebkitBackdropFilter: "blur(18px) saturate(1.08)",
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-20 h-48 w-48 rounded-full bg-[var(--color-peach)]/55 blur-3xl" />
        <div className="absolute right-[-72px] top-36 h-56 w-56 rounded-full bg-[var(--color-apricot)]/35 blur-3xl" />
        <div className="absolute bottom-28 right-[-36px] h-44 w-44 rounded-full bg-[var(--color-mint)]/35 blur-3xl" />
      </div>
      {showHeader && <Header />}
      <main
        className="relative flex-1 overflow-y-auto overflow-x-hidden pb-24"
        style={{
          paddingTop: showHeader
            ? "calc(var(--safe-area-top) + 74px)"
            : "calc(var(--safe-area-top) + 12px)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="mx-auto w-full max-w-[560px]"
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
