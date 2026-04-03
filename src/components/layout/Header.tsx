import { useLocation, useNavigate } from "react-router-dom";
import { useChildContext } from "../../contexts/ChildContext";
import { CompactChildNav } from "./CompactChildNav";

type HeaderProps = {
  showBackButton?: boolean;
  fallbackTo?: string;
  visible?: boolean;
};

export function Header({ showBackButton = false, fallbackTo = "/", visible = true }: HeaderProps) {
  const { activeChild, children, setActiveChildId } = useChildContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (!activeChild) return null;

  const otherChildren = children.filter((child) => child.id !== activeChild.id);
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
        height: "calc(var(--safe-area-top) + 74px)",
        background: "var(--gradient-shell-top-overlay)",
        backdropFilter: "blur(24px) saturate(1.02)",
        WebkitBackdropFilter: "blur(24px) saturate(1.02)",
      }}
    >
      <div
        className="mx-auto flex max-w-[600px] items-center justify-between gap-3 bg-transparent px-4 py-3"
        style={{ marginTop: "calc(var(--safe-area-top) + 16px)" }}
      >
        <CompactChildNav
          activeChild={activeChild}
          otherChildren={otherChildren}
          onSelectChild={setActiveChildId}
          showBackButton={showBackButton}
          onBack={showBackButton ? handleBack : undefined}
          className="flex w-full items-center justify-between gap-3"
        />
      </div>
    </header>
  );
}
