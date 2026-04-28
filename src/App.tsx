import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChildProvider, useChildActions, useChildLoadState, useChildren } from "./contexts/ChildContext";
import { DatabaseProvider } from "./contexts/DatabaseContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UnitsProvider } from "./contexts/UnitsContext";
import { ErrorBoundary } from "./components/ui/error-boundary";
import { ToastProvider } from "./components/ui/toast";
import { TrialProvider, useTrialAccess, useTrialActions } from "./contexts/TrialContext";
import { AppShell } from "./components/layout/AppShell";
import { Paywall } from "./components/billing/Paywall";
import { Home } from "./pages/Home";
import { Onboarding } from "./pages/Onboarding";
import { History } from "./pages/History";
import { Poop } from "./pages/Poop";
import { Diaper } from "./pages/Diaper";
import { Feed } from "./pages/Feed";
import { Dashboard } from "./pages/Dashboard";
import { Growth } from "./pages/Growth";
import { Sleep } from "./pages/Sleep";
import { Milestones } from "./pages/Milestones";
import { Breastfeed } from "./pages/Breastfeed";
import { Guidance } from "./pages/Guidance";
import { Settings } from "./pages/Settings";
import { Report } from "./pages/Report";
import { AddChild } from "./pages/AddChild";
import { AllKids } from "./pages/AllKids";
import { Privacy } from "./pages/Privacy";

function AppRoutes() {
  const children = useChildren();
  const { isLoading, loadError: childLoadError } = useChildLoadState();
  const { refreshChildren } = useChildActions();
  const { isLocked, isLoading: isTrialLoading, loadError: trialLoadError } = useTrialAccess();
  const { refreshTrial } = useTrialActions();
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
    // Show nothing for the first 100ms to avoid a flash if loading is instant
    if (loadingForMs < 100) return <div className="min-h-screen bg-[var(--color-bg)]" />;

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
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Paywall />} />
      </Routes>
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
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <DatabaseProvider>
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
        </DatabaseProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
