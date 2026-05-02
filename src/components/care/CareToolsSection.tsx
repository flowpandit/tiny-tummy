import {
  HomeToolGrowthIcon,
  HomeToolMilestonesIcon,
  HomeToolReportIcon,
  HomeToolTrendsIcon,
} from "../ui/icons";
import { CareToolGrid } from "./CareToolGrid";

interface CareToolsSectionProps {
  className?: string;
  palette?: "default" | "soft";
}

const CARE_TOOL_ITEMS = [
  {
    label: "Trends",
    icon: <HomeToolTrendsIcon className="h-5 w-5" />,
    background: "var(--color-home-tool-report)",
    color: "#36bf73",
    to: "/dashboard",
  },
  {
    label: "Report",
    icon: <HomeToolReportIcon className="h-5 w-5" />,
    background: "var(--color-home-tool-history)",
    color: "#3b8fdb",
    to: "/report",
  },
  {
    label: "Growth",
    icon: <HomeToolGrowthIcon className="h-5 w-5" />,
    background: "var(--color-home-tool-growth)",
    color: "#3b8fdb",
    to: "/growth",
  },
  {
    label: "Milestones",
    icon: <HomeToolMilestonesIcon className="h-5 w-5" />,
    background: "var(--color-home-tool-milestone)",
    color: "#36bf73",
    to: "/milestones",
  },
] as const;

const SOFT_CARE_TOOL_ITEMS = [
  {
    label: "Trends",
    icon: <HomeToolTrendsIcon className="h-5 w-5" />,
    background: "var(--gradient-care-tool-soft-green)",
    borderColor: "var(--color-care-tool-soft-green-border)",
    color: "var(--color-care-tool-soft-green)",
    textColor: "var(--color-care-tool-soft-text)",
    to: "/dashboard",
  },
  {
    label: "Report",
    icon: <HomeToolReportIcon className="h-5 w-5" />,
    background: "var(--gradient-care-tool-soft-blue)",
    borderColor: "var(--color-care-tool-soft-blue-border)",
    color: "var(--color-care-tool-soft-blue)",
    textColor: "var(--color-care-tool-soft-text)",
    to: "/report",
  },
  {
    label: "Growth",
    icon: <HomeToolGrowthIcon className="h-5 w-5" />,
    background: "var(--gradient-care-tool-soft-blue)",
    borderColor: "var(--color-care-tool-soft-blue-border)",
    color: "var(--color-care-tool-soft-blue)",
    textColor: "var(--color-care-tool-soft-text)",
    to: "/growth",
  },
  {
    label: "Milestones",
    icon: <HomeToolMilestonesIcon className="h-5 w-5" />,
    background: "var(--gradient-care-tool-soft-green)",
    borderColor: "var(--color-care-tool-soft-green-border)",
    color: "var(--color-care-tool-soft-green)",
    textColor: "var(--color-care-tool-soft-text)",
    to: "/milestones",
  },
] as const;

export function CareToolsSection({ className = "px-4", palette = "default" }: CareToolsSectionProps) {
  const items = palette === "soft" ? SOFT_CARE_TOOL_ITEMS : CARE_TOOL_ITEMS;

  return (
    <div className={className}>
      <div>
        <p className="px-3 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:px-0 md:text-[0.85rem]">Care tools</p>
        <div className="mt-4">
          <CareToolGrid items={[...items]} />
        </div>
      </div>
    </div>
  );
}
