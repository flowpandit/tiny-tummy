import { Link } from "react-router-dom";
import {
  HomeToolGrowthIcon,
  HomeToolHistoryIcon,
  HomeToolMilestonesIcon,
} from "../ui/icons";

export function PoopRelatedLinks() {
  return (
    <div className="px-1">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Related</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Link
            to="/dashboard"
            className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-home-tool-growth)" }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
              <HomeToolGrowthIcon className="h-4 w-4" />
            </span>
            <span className="text-[0.72rem] font-semibold leading-tight">Trend</span>
          </Link>
          <Link
            to="/history"
            className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-home-tool-history)" }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
              <HomeToolHistoryIcon className="h-4 w-4" />
            </span>
            <span className="text-[0.72rem] font-semibold leading-tight">History</span>
          </Link>
          <Link
            to="/guidance"
            className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-home-tool-milestone)" }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
              <HomeToolMilestonesIcon className="h-4 w-4" />
            </span>
            <span className="text-[0.72rem] font-semibold leading-tight">Guidance</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
