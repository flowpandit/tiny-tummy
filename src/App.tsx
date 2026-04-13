import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChildProvider, useChildContext } from "./contexts/ChildContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UnitsProvider } from "./contexts/UnitsContext";
import { ErrorBoundary } from "./components/ui/error-boundary";
import { ToastProvider } from "./components/ui/toast";
import { AppShell } from "./components/layout/AppShell";
import { TrialProvider, useTrial } from "./contexts/TrialContext";
import { Paywall } from "./components/billing/Paywall";


import { Home } from "./pages/Home";
import { Onboarding } from "./pages/Onboarding";

// Lazy loaded (non-critical)
const History = lazy(() => import("./pages/History").then((m) => ({ default: m.History })));
const Poop = lazy(() => import("./pages/Poop").then((m) => ({ default: m.Poop })));
const Diaper = lazy(() => import("./pages/Diaper").then((m) => ({ default: m.Diaper })));
const Feed = lazy(() => import("./pages/Feed").then((m) => ({ default: m.Feed })));
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Growth = lazy(() => import("./pages/Growth").then((m) => ({ default: m.Growth })));
const Sleep = lazy(() => import("./pages/Sleep").then((m) => ({ default: m.Sleep })));
const Milestones = lazy(() => import("./pages/Milestones").then((m) => ({ default: m.Milestones })));
const Breastfeed = lazy(() => import("./pages/Breastfeed").then((m) => ({ default: m.Breastfeed })));
const Handoff = lazy(() => import("./pages/Handoff").then((m) => ({ default: m.Handoff })));
const Guidance = lazy(() => import("./pages/Guidance").then((m) => ({ default: m.Guidance })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const Report = lazy(() => import("./pages/Report").then((m) => ({ default: m.Report })));
const AddChild = lazy(() => import("./pages/AddChild").then((m) => ({ default: m.AddChild })));
const AllKids = lazy(() => import("./pages/AllKids").then((m) => ({ default: m.AllKids })));
const Privacy = lazy(() => import("./pages/Privacy").then((m) => ({ default: m.Privacy })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const {
    children,
    isLoading,
    loadError: childLoadError,
    refreshChildren,
  } = useChildContext();
  const {
    isLocked,
    isLoading: isTrialLoading,
    loadError: trialLoadError,
    refreshTrial,
  } = useTrial();
  const [loadingForMs, setLoadingForMs] = useState(0);

  useEffect(() => {
    if (!isLoading && !isTrialLoading) {
      setLoadingForMs(0);
      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setLoadingForMs(Date.now() - startedAt);
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLoading, isTrialLoading]);

  if (isLoading || isTrialLoading) {
    const loadingParts = [
      isLoading ? "children" : null,
      isTrialLoading ? "trial" : null,
    ].filter(Boolean).join(" + ");

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          {import.meta.env.DEV ? (
            <div className="max-w-xs text-xs text-[var(--color-text-secondary)]">
              <div>Loading: {loadingParts || "startup"}</div>
              <div>{(loadingForMs / 1000).toFixed(1)}s</div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (childLoadError || trialLoadError) {
    const messages = [childLoadError, trialLoadError].filter(Boolean) as string[];

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
        <div className="w-full max-w-sm rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-lg)]">
          <h1 className="text-lg font-semibold text-[var(--color-text)]">Startup blocked</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Tiny Tummy could not finish loading. Your data has not been changed.
          </p>
          <div className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
            {messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              void Promise.all([refreshChildren(), refreshTrial()]);
            }}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white"
          >
            Retry startup
          </button>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Paywall />} />
        </Routes>
      </Suspense>
    );
  }

  if (children.length === 0) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/poop" element={<Poop />} />
          <Route path="/diaper" element={<Diaper />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/history" element={<History />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/growth" element={<Growth />} />
          <Route path="/sleep" element={<Sleep />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/breastfeed" element={<Breastfeed />} />
          <Route path="/handoff" element={<Handoff />} />
          <Route path="/guidance" element={<Guidance />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/report" element={<Report />} />
        </Route>
        <Route path="/add-child" element={<AddChild />} />
        <Route path="/all-kids" element={<AllKids />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <UnitsProvider>
            <ToastProvider>
              <ChildProvider>
                <TrialProvider>
                  <AppRoutes />
                </TrialProvider>
              </ChildProvider>
            </ToastProvider>
          </UnitsProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
