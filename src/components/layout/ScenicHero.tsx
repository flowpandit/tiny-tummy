import { useId, type ReactNode, type RefObject } from "react";
import { motion } from "framer-motion";
import watercolorClouds from "../../assets/watercolor-clouds.svg";
import watercolorCloudsDark from "../../assets/watercolor-clouds-dark.svg";
import watercolorMountains from "../../assets/watercolor-mountains.svg";
import watercolorMountainsDark from "../../assets/watercolor-mountains-dark.svg";
import watercolorMoon from "../../assets/watercolor-moon.svg";
import watercolorSun from "../../assets/watercolor-sun.svg";
import heroBackgroundArt from "../../assets/svg-assets/hero-background.svg";
import heroBackgroundArtDark from "../../assets/svg-assets/hero-background-dark.svg";
import breastfeedingSceneArt from "../../assets/svg-assets/breastfeeding.svg";
import diaperSceneArt from "../../assets/svg-assets/diaper.svg";
import feedSceneArt from "../../assets/svg-assets/feed.svg";
import growthSceneArt from "../../assets/svg-assets/growth.svg";
import poopSceneArt from "../../assets/svg-assets/poop.svg";
import sleepSceneArt from "../../assets/svg-assets/sleep.svg";
import homeCloud1 from "../../assets/svg-assets/hero-pieces/cloud-1.svg";
import homeCloud3 from "../../assets/svg-assets/hero-pieces/cloud-3.svg";
import homeCloud5 from "../../assets/svg-assets/hero-pieces/cloud-5.svg";
import homeMount1 from "../../assets/svg-assets/hero-pieces/mount-1.svg";
import sceneSun from "../../assets/svg-assets/sun.svg";
import type { Child } from "../../lib/types";
import { getAgeLabelFromDob } from "../../lib/utils";
import { useTheme } from "../../contexts/ThemeContext";
import { Avatar } from "../child/Avatar";

type ScenicHeroProps = {
  child: Child;
  title: string;
  description: string;
  action?: ReactNode;
  avatarAnchorRef?: RefObject<HTMLDivElement | null>;
  showChildInfo?: boolean;
  className?: string;
  scene?: "default" | "home" | "sleep" | "feed" | "breastfeed" | "diaper" | "poop" | "growth";
};

export function ScenicHero({
  child,
  title,
  description,
  action,
  avatarAnchorRef,
  showChildInfo = true,
  className,
  scene = "default",
}: ScenicHeroProps) {
  const clipPathId = useId();
  const { resolved } = useTheme();
  const isDarkArtwork = resolved !== "light";
  const skyArt = isDarkArtwork ? watercolorCloudsDark : watercolorClouds;
  const ridgeArt = isDarkArtwork ? watercolorMountainsDark : watercolorMountains;
  const orbArt = isDarkArtwork ? watercolorMoon : watercolorSun;
  const homeOrbArt = isDarkArtwork ? watercolorMoon : sceneSun;
  const sceneBackgroundArt = isDarkArtwork ? heroBackgroundArtDark : heroBackgroundArt;
  const useHomeScene = scene === "home";
  const useSleepScene = scene === "sleep";
  const useFeedScene = scene === "feed";
  const useBreastfeedScene = scene === "breastfeed";
  const useDiaperScene = scene === "diaper";
  const usePoopScene = scene === "poop";
  const useGrowthScene = scene === "growth";

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
        {useHomeScene ? (
          <>
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isDarkArtwork
                  ? "radial-gradient(circle at 28% 24%, rgba(214, 226, 247, 0.16) 0%, rgba(20, 28, 40, 0) 46%)"
                  : "radial-gradient(circle at 22% 24%, rgba(255, 248, 239, 0.82) 0%, rgba(255, 255, 255, 0) 52%)",
              }}
            />
            <img
              src={homeCloud1}
              alt=""
              aria-hidden="true"
              className={isDarkArtwork
                ? "pointer-events-none absolute left-[-18px] top-[18px] w-[174px] md:w-[204px]"
                : "pointer-events-none absolute left-[-34px] top-[18px] w-[188px] md:w-[228px]"}
              style={{ opacity: isDarkArtwork ? 0.2 : 0.62 }}
            />
            <img
              src={homeCloud3}
              alt=""
              aria-hidden="true"
              className={isDarkArtwork
                ? "pointer-events-none absolute left-1/2 top-[58px] w-[188px] -translate-x-1/2 md:w-[216px]"
                : "pointer-events-none absolute left-[118px] top-[42px] w-[176px] md:w-[204px]"}
              style={{ opacity: isDarkArtwork ? 0.16 : 0.52 }}
            />
            <img
              src={homeOrbArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-[14px] top-[14px] w-[118px] opacity-95 md:w-[132px]"
            />
            <img
              src={homeCloud5}
              alt=""
              aria-hidden="true"
              className={isDarkArtwork
                ? "pointer-events-none absolute right-[96px] bottom-[112px] w-[144px] md:right-[118px] md:w-[172px]"
                : "pointer-events-none absolute left-1/2 bottom-[112px] w-[168px] -translate-x-1/2 md:w-[196px]"}
              style={{ opacity: isDarkArtwork ? 0.1 : 0.22 }}
            />
            <img
              src={homeMount1}
              alt=""
              aria-hidden="true"
              className={isDarkArtwork
                ? "pointer-events-none absolute left-1/2 bottom-[26px] w-[220%] max-w-none -translate-x-1/2"
                : "pointer-events-none absolute left-1/2 bottom-[26px] w-[250%] max-w-none -translate-x-1/2"}
              style={{
                opacity: isDarkArtwork ? 0.9 : 0.94,
                filter: isDarkArtwork
                  ? "sepia(28%) saturate(100%) hue-rotate(174deg) brightness(0.78)"
                  : "sepia(10%) saturate(100%) hue-rotate(0deg) brightness(0.90)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-[18px] h-[132px]"
              style={{
                background: isDarkArtwork
                  ? "linear-gradient(180deg, rgba(17, 28, 42, 0) 0%, rgba(17, 28, 42, 0.18) 100%)"
                  : "linear-gradient(180deg, rgba(160, 102, 66, 0) 0%, rgba(160, 102, 66, 0.12) 100%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-[-10%] top-[122px] h-[164px]"
              style={{ background: "var(--gradient-hero-ridge)", opacity: isDarkArtwork ? 0.48 : 0.34 }}
            />
          </>
        ) : useSleepScene ? (
          <>
            <img
              src={sceneBackgroundArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-10%] top-[-36px] w-[124%] max-w-none opacity-70"
              style={{
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.88) hue-rotate(8deg) brightness(1.02)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isDarkArtwork
                  ? "radial-gradient(circle at 74% 18%, rgba(230, 238, 255, 0.22) 0%, rgba(20, 28, 40, 0) 30%), linear-gradient(180deg, rgba(25, 33, 49, 0.06) 0%, rgba(20, 28, 40, 0.22) 100%)"
                  : "radial-gradient(circle at 72% 18%, rgba(255, 247, 224, 0.48) 0%, rgba(255, 255, 255, 0) 28%), linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(246, 223, 214, 0.12) 100%)",
              }}
            />
            <img
              src={sleepSceneArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-[-4%] bottom-[90px] w-[74%] max-w-none md:right-[2%] md:w-[62%]"
              style={{
                opacity: isDarkArtwork ? 0.78 : 0.88,
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.92) hue-rotate(4deg) brightness(0.96)",
              }}
            />
            <div
              className="pointer-events-none absolute left-[10%] top-[122px] h-[110px] w-[34%] rounded-full blur-[20px]"
              style={{ background: isDarkArtwork ? "rgba(141, 161, 202, 0.08)" : "rgba(255, 232, 212, 0.28)" }}
            />
          </>
        ) : useFeedScene ? (
          <>
            <img
              src={sceneBackgroundArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-12%] top-[-44px] w-[128%] max-w-none opacity-72"
              style={{
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.94) hue-rotate(4deg) brightness(1.02)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isDarkArtwork
                  ? "radial-gradient(circle at 76% 24%, rgba(188, 207, 244, 0.16) 0%, rgba(20, 28, 40, 0) 30%), linear-gradient(180deg, rgba(37, 46, 63, 0.06) 0%, rgba(20, 28, 40, 0.16) 100%)"
                  : "radial-gradient(circle at 74% 20%, rgba(255, 244, 214, 0.46) 0%, rgba(255, 255, 255, 0) 30%), linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(246, 223, 214, 0.1) 100%)",
              }}
            />
            <img
              src={feedSceneArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-[-6%] bottom-[26px] w-[82%] max-w-none md:right-[0%] md:w-[68%]"
              style={{
                opacity: isDarkArtwork ? 0.82 : 0.92,
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.96) hue-rotate(2deg) brightness(0.98)",
              }}
            />
            <div
              className="pointer-events-none absolute left-[8%] top-[114px] h-[118px] w-[40%] rounded-full blur-[22px]"
              style={{ background: isDarkArtwork ? "rgba(141, 161, 202, 0.06)" : "rgba(255, 234, 216, 0.24)" }}
            />
          </>
        ) : useBreastfeedScene ? (
          <>
            <img
              src={sceneBackgroundArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-12%] top-[-42px] w-[126%] max-w-none opacity-72"
              style={{
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.94) hue-rotate(4deg) brightness(1.02)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isDarkArtwork
                  ? "radial-gradient(circle at 72% 24%, rgba(206, 195, 233, 0.14) 0%, rgba(20, 28, 40, 0) 32%), linear-gradient(180deg, rgba(36, 42, 58, 0.06) 0%, rgba(20, 28, 40, 0.14) 100%)"
                  : "radial-gradient(circle at 74% 22%, rgba(255, 239, 214, 0.4) 0%, rgba(255, 255, 255, 0) 30%), linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(246, 223, 214, 0.1) 100%)",
              }}
            />
            <img
              src={breastfeedingSceneArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-[-14%] bottom-[10px] w-[76%] max-w-none md:right-[-6%] md:w-[62%]"
              style={{
                opacity: isDarkArtwork ? 0.84 : 0.92,
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.94) hue-rotate(2deg) brightness(0.98)",
              }}
            />
            <div
              className="pointer-events-none absolute left-[10%] top-[118px] h-[112px] w-[38%] rounded-full blur-[20px]"
              style={{ background: isDarkArtwork ? "rgba(169, 160, 201, 0.06)" : "rgba(255, 232, 212, 0.22)" }}
            />
          </>
        ) : useDiaperScene ? (
          <>
            <img
              src={sceneBackgroundArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-12%] top-[-42px] w-[126%] max-w-none opacity-72"
              style={{
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.94) hue-rotate(4deg) brightness(1.02)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isDarkArtwork
                  ? "radial-gradient(circle at 76% 22%, rgba(188, 207, 244, 0.14) 0%, rgba(20, 28, 40, 0) 30%), linear-gradient(180deg, rgba(36, 42, 58, 0.06) 0%, rgba(20, 28, 40, 0.14) 100%)"
                  : "radial-gradient(circle at 72% 22%, rgba(255, 241, 214, 0.42) 0%, rgba(255, 255, 255, 0) 30%), linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(246, 223, 214, 0.1) 100%)",
              }}
            />
            <img
              src={diaperSceneArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-[-10%] bottom-[20px] w-[72%] max-w-none md:right-[-4%] md:w-[58%]"
              style={{
                opacity: isDarkArtwork ? 0.84 : 0.92,
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.96) hue-rotate(2deg) brightness(0.98)",
              }}
            />
            <div
              className="pointer-events-none absolute left-[8%] top-[116px] h-[112px] w-[40%] rounded-full blur-[20px]"
              style={{ background: isDarkArtwork ? "rgba(141, 161, 202, 0.06)" : "rgba(255, 232, 212, 0.22)" }}
            />
          </>
        ) : usePoopScene ? (
          <>
            <img
              src={sceneBackgroundArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-12%] top-[-42px] w-[126%] max-w-none opacity-72"
              style={{
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.94) hue-rotate(4deg) brightness(1.02)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isDarkArtwork
                  ? "radial-gradient(circle at 76% 22%, rgba(188, 207, 244, 0.12) 0%, rgba(20, 28, 40, 0) 32%), linear-gradient(180deg, rgba(36, 42, 58, 0.06) 0%, rgba(20, 28, 40, 0.14) 100%)"
                  : "radial-gradient(circle at 72% 20%, rgba(255, 238, 212, 0.38) 0%, rgba(255, 255, 255, 0) 30%), linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(246, 223, 214, 0.1) 100%)",
              }}
            />
            <img
              src={poopSceneArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-[1%] bottom-[72px] w-[44%] max-w-none md:right-[4%] md:w-[36%]"
              style={{
                opacity: isDarkArtwork ? 0.84 : 0.92,
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.96) hue-rotate(2deg) brightness(0.98)",
              }}
            />
            <div
              className="pointer-events-none absolute left-[10%] top-[120px] h-[108px] w-[38%] rounded-full blur-[20px]"
              style={{ background: isDarkArtwork ? "rgba(169, 160, 201, 0.05)" : "rgba(255, 232, 212, 0.2)" }}
            />
          </>
        ) : useGrowthScene ? (
          <>
            <img
              src={sceneBackgroundArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-12%] top-[-42px] w-[126%] max-w-none opacity-72"
              style={{
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.94) hue-rotate(4deg) brightness(1.02)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isDarkArtwork
                  ? "radial-gradient(circle at 74% 18%, rgba(188, 207, 244, 0.16) 0%, rgba(20, 28, 40, 0) 30%), linear-gradient(180deg, rgba(36, 42, 58, 0.06) 0%, rgba(20, 28, 40, 0.14) 100%)"
                  : "radial-gradient(circle at 72% 18%, rgba(255, 241, 214, 0.44) 0%, rgba(255, 255, 255, 0) 30%), linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(246, 223, 214, 0.1) 100%)",
              }}
            />
            <img
              src={growthSceneArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-[-1%] bottom-[24px] w-[32%] max-w-none md:right-[2%] md:w-[38%]"
              style={{
                opacity: isDarkArtwork ? 0.84 : 0.92,
                filter: isDarkArtwork
                  ? "none"
                  : "saturate(0.96) hue-rotate(2deg) brightness(0.98)",
              }}
            />
            <div
              className="pointer-events-none absolute left-[8%] top-[116px] h-[112px] w-[40%] rounded-full blur-[20px]"
              style={{ background: isDarkArtwork ? "rgba(141, 161, 202, 0.06)" : "rgba(255, 232, 212, 0.22)" }}
            />
          </>
        ) : (
          <>
            <img src={skyArt} alt="" aria-hidden="true" className="pointer-events-none absolute left-[-14px] top-[18px] w-[calc(100%+28px)] opacity-95" />
            <img src={orbArt} alt="" aria-hidden="true" className="pointer-events-none absolute right-[14px] top-[10px] w-[130px] opacity-95" />
            <img src={ridgeArt} alt="" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[74px] w-full scale-[1.12] opacity-100" />
            <div className="pointer-events-none absolute inset-x-[-6%] top-[86px] h-[165px]" style={{ background: "var(--gradient-hero-ridge)" }} />
          </>
        )}
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
