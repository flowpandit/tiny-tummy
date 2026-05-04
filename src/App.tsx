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
import { Logo } from "./components/ui/Logo";
import { Home } from "./pages/Home";
import { Onboarding } from "./pages/Onboarding";
import { History } from "./pages/History";
import { Poop } from "./pages/Poop";
import { Diaper } from "./pages/Diaper";
import { Feed } from "./pages/Feed";
import { Dashboard } from "./pages/Dashboard";
import { Growth } from "./pages/Growth";
import { Health } from "./pages/Health";
import { Sleep } from "./pages/Sleep";
import { Milestones } from "./pages/Milestones";
import { Breastfeed } from "./pages/Breastfeed";
import { Guidance } from "./pages/Guidance";
import { Settings } from "./pages/Settings";
import { Report } from "./pages/Report";
import { AddChild } from "./pages/AddChild";
import { AllKids } from "./pages/AllKids";
import { Privacy } from "./pages/Privacy";

function StartupSetupScreen({ loadingParts, loadingForMs }: { loadingParts: string; loadingForMs: number }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-6 text-[var(--color-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center text-center">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-soft)]">
          <Logo className="h-full w-full" />
          <span className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full border-4 border-[var(--color-bg)] bg-[var(--color-primary)]">
            <span className="block h-full w-full animate-ping rounded-full bg-[var(--color-primary)] opacity-35" />
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">
          Setting up Tiny Tummy
        </h1>
        <p className="mt-3 max-w-[18rem] text-sm leading-6 text-[var(--color-text-secondary)]">
          Preparing your private on-device space. This usually only takes a moment on first install.
        </p>
        <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-strong)]">
          <div className="h-full w-1/2 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-[var(--color-primary)]" />
        </div>
        {import.meta.env.DEV && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs text-[var(--color-text-secondary)]">
            <div>Loading: {loadingParts || "startup"}</div>
            <div>{(loadingForMs / 1000).toFixed(1)}s</div>
          </div>
        )}
      </div>
    </div>
  );
}

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
    if (loadingForMs < 250) return <div className="min-h-screen bg-[var(--color-bg)]" />;

    const loadingParts = [
      isLoading ? "children" : null,
      isTrialLoading ? "trial" : null,
    ].filter(Boolean).join(" + ");

    return <StartupSetupScreen loadingParts={loadingParts} loadingForMs={loadingForMs} />;
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
        <Route path="/unlock" element={<Paywall />} />
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
        <Route path="/health" element={<Health />} />
        <Route path="/sleep" element={<Sleep />} />
        <Route path="/milestones" element={<Milestones />} />
        <Route path="/breastfeed" element={<Breastfeed />} />
        <Route path="/guidance" element={<Guidance />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/report" element={<Report />} />
      </Route>
      <Route path="/unlock" element={<Paywall />} />
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
