import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export interface CareToolGridItem {
  label: string;
  icon: ReactNode;
  background: string;
  color?: string;
  textColor?: string;
  borderColor?: string;
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
          className="flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-[18px] border border-transparent px-2.5 py-2.5 text-center text-[var(--color-text)] shadow-[0_14px_28px_rgba(172,139,113,0.08)] transition-transform hover:-translate-y-0.5 md:min-h-[112px] md:gap-3 md:rounded-[20px]"
          style={{ background: item.background, borderColor: item.borderColor }}
        >
          <span className="flex h-7 w-7 items-center justify-center md:h-9 md:w-9" style={{ color: item.color ?? "#2fbf75" }}>
            {item.icon}
          </span>
          <span className="text-[0.82rem] font-semibold leading-tight md:text-[1.1rem]" style={{ color: item.textColor }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
