import { useNavigate } from "react-router-dom";
import {
  HomeToolGrowthIcon,
  HomeToolHandoffIcon,
  HomeToolHistoryIcon,
  HomeToolMilestonesIcon,
} from "../ui/icons";

interface CareToolsSectionProps {
  className?: string;
}

const CARE_TOOL_ITEMS = [
  {
    label: "History",
    icon: <HomeToolHistoryIcon className="h-5 w-5" />,
    background: "var(--color-home-tool-history)",
    to: "/history",
  },
  {
    label: "Growth",
    icon: <HomeToolGrowthIcon className="h-5 w-5" />,
    background: "var(--color-home-tool-growth)",
    to: "/growth",
  },
  {
    label: "Milestones",
    icon: <HomeToolMilestonesIcon className="h-5 w-5" />,
    background: "var(--color-home-tool-milestone)",
    to: "/milestones",
  },
  {
    label: "Caregiver handoff",
    icon: <HomeToolHandoffIcon className="h-5 w-5" />,
    background: "var(--color-home-tool-handoff)",
    to: "/handoff",
  },
] as const;

export function CareToolsSection({ className = "px-4" }: CareToolsSectionProps) {
  const navigate = useNavigate();

  return (
    <div className={className}>
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Care tools</p>
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {CARE_TOOL_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
              style={{ background: item.background }}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
                {item.icon}
              </span>
              <span className="text-[0.72rem] font-semibold leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
