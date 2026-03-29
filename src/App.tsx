import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChildProvider, useChildContext } from "./contexts/ChildContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ErrorBoundary } from "./components/ui/error-boundary";
import { ToastProvider } from "./components/ui/toast";
import { AppShell } from "./components/layout/AppShell";


// Eagerly loaded (critical path)
import { Home } from "./pages/Home";
import { Onboarding } from "./pages/Onboarding";

// Lazy loaded (non-critical)
const History = lazy(() => import("./pages/History").then((m) => ({ default: m.History })));
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
  const { children, isLoading } = useChildContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
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
          <ToastProvider>
            <ChildProvider>
              <AppRoutes />
            </ChildProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
