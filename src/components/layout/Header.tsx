import { useLocation, useNavigate } from "react-router-dom";
import { useChildContext } from "../../contexts/ChildContext";
import { CompactChildNav } from "./CompactChildNav";

type HeaderProps = {
  showBackButton?: boolean;
  fallbackTo?: string;
};

export function Header({ showBackButton = false, fallbackTo = "/" }: HeaderProps) {
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
      className="fixed inset-x-0 top-0 z-30"
      style={{
        height: "calc(var(--safe-area-top) + 74px)",
        background: "linear-gradient(180deg, rgba(255,250,243,0.95) 0%, rgba(255,250,243,0.55) 74%, transparent 100%)",
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
