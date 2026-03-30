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
  const hideHeaderPaths = new Set(["/", "/feed", "/guidance", "/settings"]);
  const showHeader = !hideHeaderPaths.has(location.pathname);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--color-bg)]">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[25]"
        style={{
          height: "calc(var(--safe-area-top) + 18px)",
          background:
            "linear-gradient(180deg, var(--color-surface-strong) 0%, color-mix(in srgb, var(--color-surface-strong) 72%, transparent) 72%, transparent 100%)",
          backdropFilter: "blur(22px) saturate(1.02)",
          WebkitBackdropFilter: "blur(22px) saturate(1.02)",
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-16 h-56 w-56 rounded-full bg-[var(--color-peach)]/26 blur-3xl" />
        <div className="absolute right-[-88px] top-44 h-64 w-64 rounded-full bg-[var(--color-apricot)]/18 blur-3xl" />
        <div className="absolute bottom-24 right-[-52px] h-52 w-52 rounded-full bg-[var(--color-mint)]/18 blur-3xl" />
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
