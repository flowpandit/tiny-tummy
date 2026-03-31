import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";

const iconClassName = "h-5 w-5";

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
    path: "/poop",
    label: "Poop",
    matches: (pathname: string) => pathname === "/poop",
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} className={iconClassName}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c.87 0 1.601.61 1.789 1.423.152.656.514 1.243 1.029 1.671A4.86 4.86 0 0 1 18 10.5c0 3.314-2.686 6-6 6s-6-2.686-6-6a4.86 4.86 0 0 1 3.182-4.556 3.01 3.01 0 0 0 1.029-1.671A1.835 1.835 0 0 1 12 3.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 19.5c.73.477 1.601.75 2.55.75.949 0 1.82-.273 2.55-.75" />
      </svg>
    ),
  },
  {
    path: "/dashboard",
    label: "Trend",
    matches: (pathname: string) => pathname === "/dashboard",
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} className={iconClassName}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    path: "/feed",
    label: "Feed",
    matches: (pathname: string) => pathname === "/feed",
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} className={iconClassName}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 10.5c0 3.866 3.134 7 7 7s7-3.134 7-7H5Z"
          fill={active ? "currentColor" : "none"}
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5c.473-2.09 2.333-3.75 4.5-3.75 2.167 0 4.027 1.66 4.5 3.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 19.5h7.5" />
      </svg>
    ),
  },
  {
    path: "/sleep",
    label: "Sleep",
    matches: (pathname: string) => pathname === "/sleep",
    icon: (active: boolean) => (
      active ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={iconClassName}>
          <path d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75C12.615 15.75 8.25 11.385 8.25 6c0-1.293.252-2.527.71-3.657A9.753 9.753 0 0 0 2.25 12c0 5.385 4.365 9.75 9.75 9.75a9.753 9.753 0 0 0 9.752-6.748Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={iconClassName}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c-.12.64-.21 1.3-.21 2a9 9 0 0 0 10 7.79Z" />
        </svg>
      )
    ),
  },
  {
    path: "/settings",
    label: "Setting",
    matches: (pathname: string) => (
      pathname === "/settings"
      || pathname === "/history"
      || pathname === "/growth"
      || pathname === "/milestones"
      || pathname === "/guidance"
      || pathname === "/handoff"
      || pathname === "/all-kids"
    ),
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} className={iconClassName}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 px-3" style={{ paddingBottom: "calc(var(--safe-area-bottom) + 8px)" }}>
      <div className="mx-auto flex h-[68px] max-w-[600px] items-center justify-around rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-strong)]/92 px-2 shadow-[0_18px_42px_rgba(32,24,18,0.12)] backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matches(location.pathname);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] cursor-pointer transition-all duration-200",
                isActive
                  ? "bg-[var(--color-bg-elevated)]/88 text-[var(--color-primary)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text-secondary)]",
              )}
              aria-label={item.label}
              >
                <span
                  className={cn(
                  "absolute left-1/2 top-1 h-0.5 w-8 -translate-x-1/2 rounded-full transition-opacity duration-200",
                  isActive ? "bg-[var(--color-cta)] opacity-100" : "opacity-0",
                  )}
                />
              <span className="flex h-6 w-6 items-center justify-center">
                {item.icon(isActive)}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.02em] truncate max-w-full px-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
