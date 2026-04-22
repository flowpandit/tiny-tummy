import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export interface CareToolGridItem {
  label: string;
  icon: ReactNode;
  background: string;
  to: string;
}

export function CareToolGrid({
  items,
  columnsClassName = "grid-cols-4",
}: {
  items: CareToolGridItem[];
  columnsClassName?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className={`grid gap-2 ${columnsClassName}`}>
      {items.map((item) => (
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
  );
}
