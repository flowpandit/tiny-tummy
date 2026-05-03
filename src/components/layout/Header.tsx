import { useLocation, useNavigate } from "react-router-dom";
import { useActiveChild, useChildActions, useChildren } from "../../contexts/ChildContext";
import { useUnits } from "../../contexts/UnitsContext";
import { useGrowthLogs } from "../../hooks/useGrowthLogs";
import { buildChildProfileSubtitleParts } from "../../lib/child-profile-summary";
import { CompactChildNav } from "./CompactChildNav";

type HeaderProps = {
  showBackButton?: boolean;
  fallbackTo?: string;
  visible?: boolean;
  density?: "default" | "compact";
};

export function Header({ showBackButton = false, fallbackTo = "/", visible = true, density = "default" }: HeaderProps) {
  const activeChild = useActiveChild();
  const children = useChildren();
  const { setActiveChildId } = useChildActions();
  const { unitSystem } = useUnits();
  const { logs: growthLogs } = useGrowthLogs(activeChild?.id ?? null);
  const navigate = useNavigate();
  const location = useLocation();

  if (!activeChild) return null;

  const otherChildren = children.filter((child) => child.id !== activeChild.id);
  const isCompact = density === "compact";
  const profileSubtitleParts = buildChildProfileSubtitleParts({ child: activeChild, growthLogs, unitSystem });
  const originPath = location.state && typeof location.state === "object" && "origin" in location.state
    ? (location.state as { origin?: string }).origin
    : undefined;

  const handleBack = () => {
    if (location.key !== "default" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(originPath ?? fallbackTo);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-all duration-200 ${visible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}
      style={{
        height: isCompact ? "calc(var(--safe-area-top) + 72px)" : "calc(var(--safe-area-top) + 92px)",
        background: "var(--gradient-shell-top-overlay)",
        borderBottom: "1px solid color-mix(in srgb, var(--color-border) 90%, transparent)",
        backdropFilter: "blur(24px) saturate(1.18)",
        WebkitBackdropFilter: "blur(24px) saturate(1.18)",
        boxShadow: "0 12px 30px rgba(120, 92, 69, 0.06)",
      }}
    >
      <div
        className={`mx-auto flex max-w-[1180px] items-center justify-between gap-3 bg-transparent ${isCompact ? "px-4 py-1.5" : "px-5 py-3"}`}
        style={{ marginTop: isCompact ? "calc(var(--safe-area-top) + 6px)" : "calc(var(--safe-area-top) + 12px)" }}
      >
        <CompactChildNav
          activeChild={activeChild}
          otherChildren={otherChildren}
          onSelectChild={setActiveChildId}
          showBackButton={showBackButton}
          onBack={showBackButton ? handleBack : undefined}
          density={density}
          profileSubtitleParts={profileSubtitleParts}
          className="flex w-full items-center justify-between gap-3"
        />
      </div>
    </header>
  );
}
