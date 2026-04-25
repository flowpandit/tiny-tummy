import {
  HomeToolGrowthIcon,
  HomeToolHistoryIcon,
  HomeToolMilestonesIcon,
} from "../ui/icons";
import { CareToolGrid } from "./CareToolGrid";

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
] as const;

export function CareToolsSection({ className = "px-4" }: CareToolsSectionProps) {
  return (
    <div className={className}>
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Care tools</p>
        <div className="mt-2.5">
          <CareToolGrid items={[...CARE_TOOL_ITEMS]} />
        </div>
      </div>
    </div>
  );
}
