import { useId, type ReactNode, type RefObject } from "react";
import { motion } from "framer-motion";
import watercolorClouds from "../../assets/watercolor-clouds.svg";
import watercolorMountains from "../../assets/watercolor-mountains.svg";
import watercolorSun from "../../assets/watercolor-sun.svg";
import type { Child } from "../../lib/types";
import { getAgeLabelFromDob } from "../../lib/utils";
import { Avatar } from "../child/Avatar";

type ScenicHeroProps = {
  child: Child;
  title: string;
  description: string;
  action?: ReactNode;
  avatarAnchorRef?: RefObject<HTMLDivElement | null>;
  showChildInfo?: boolean;
  className?: string;
};

export function ScenicHero({
  child,
  title,
  description,
  action,
  avatarAnchorRef,
  showChildInfo = true,
  className,
}: ScenicHeroProps) {
  const clipPathId = useId();

  return (
    <section className={className}>
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
            <path d="M0,0 H1 V0.62 Q0.6,0.74 0,0.64 Z" />
          </clipPath>
        </defs>
      </svg>
      <div
        className="relative h-[350px] overflow-hidden px-4 pt-6"
        style={{ clipPath: `url(#${clipPathId})` }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: "var(--gradient-hero-glow)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero-wash)" }} />
        <img src={watercolorClouds} alt="" aria-hidden="true" className="pointer-events-none absolute left-[-14px] top-[18px] w-[calc(100%+28px)] opacity-95" />
        <img src={watercolorSun} alt="" aria-hidden="true" className="pointer-events-none absolute right-[14px] top-[10px] w-[130px] opacity-95" />
        <img src={watercolorMountains} alt="" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[74px] w-full scale-[1.12] opacity-100" />
        <div className="pointer-events-none absolute inset-x-[-6%] top-[86px] h-[165px]" style={{ background: "var(--gradient-hero-ridge)" }} />
        <div className="pointer-events-none absolute left-[12px] top-[106px] h-12 w-20 rounded-full blur-[8px]" style={{ background: "var(--color-hero-cloud)" }} />
        <div className="pointer-events-none absolute left-[42px] top-[112px] h-8 w-8 rounded-full blur-[6px]" style={{ background: "var(--color-hero-cloud-strong)" }} />
        <div className="pointer-events-none absolute left-[72px] top-[108px] h-9 w-9 rounded-full blur-[8px]" style={{ background: "var(--color-hero-cloud-soft)" }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28" style={{ background: "var(--gradient-hero-floor)" }} />
        <div className="relative flex h-full items-start pt-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 max-w-[18rem]">
                <h1 className="font-[var(--font-display)] text-[2.05rem] font-extrabold leading-[1.1] tracking-[-0.05em] text-[var(--color-hero-title)]">
                  {title}
                </h1>
                <p className="mt-2 text-[0.98rem] leading-tight tracking-[-0.02em] text-[var(--color-text)]">
                  {description}
                </p>
              </div>
              {action ? <div className="shrink-0 pt-1">{action}</div> : null}
            </div>
            {showChildInfo && (
              <div ref={avatarAnchorRef} className="mt-5 flex items-center gap-3">
                <Avatar
                  childId={child.id}
                  name={child.name}
                  color={child.avatar_color}
                  size="sm"
                  className="h-10 w-10 border-2 shadow-[var(--shadow-soft)]"
                  style={{ borderColor: "var(--color-hero-avatar-border)" }}
                />
                <div>
                  <p className="text-[1.05rem] font-semibold text-[var(--color-text)]">{child.name}</p>
                  <p className="text-[0.82rem] leading-tight text-[var(--color-text-secondary)]">
                    {getAgeLabelFromDob(child.date_of_birth)}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
