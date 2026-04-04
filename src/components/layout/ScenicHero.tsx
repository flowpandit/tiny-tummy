import { useId, type ReactNode, type RefObject } from "react";
import { motion } from "framer-motion";
import watercolorClouds from "../../assets/svg-assets/hero-pieces/watercolor-clouds.svg";
import watercolorCloudsDark from "../../assets/svg-assets/hero-pieces/watercolor-clouds-dark.svg";
import watercolorMountains from "../../assets/svg-assets/hero-pieces/watercolor-mountains.svg";
import watercolorMountainsDark from "../../assets/svg-assets/hero-pieces/watercolor-mountains-dark.svg";
import heroBackgroundArt from "../../assets/svg-assets/hero-background.svg";
import heroBackgroundArtDark from "../../assets/svg-assets/hero-background-dark.svg";
import breastfeedingSceneArt from "../../assets/svg-assets/breastfeeding.svg";
import diaperSceneArt from "../../assets/svg-assets/diaper.svg";
import feedSceneArt from "../../assets/svg-assets/feed.svg";
import growthSceneArt from "../../assets/svg-assets/growth.svg";
import poopSceneArt from "../../assets/svg-assets/poop.svg";
import sleepSceneArt from "../../assets/svg-assets/sleep.svg";
import sceneMoon from "../../assets/svg-assets/moon.svg";
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
  const orbArt = isDarkArtwork ? sceneMoon : sceneSun;
  const homeOrbArt = isDarkArtwork ? sceneMoon : sceneSun;
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
        className={useHomeScene
          ? "relative h-[350px] overflow-hidden px-4 pt-6 md:h-[380px] md:px-0 lg:h-[410px] lg:px-0"
          : "relative h-[350px] overflow-hidden px-4 pt-6 md:h-[380px] md:px-0 lg:h-[400px] lg:px-0"}
        style={{ clipPath: `url(#${clipPathId})` }}
      >
        {!useHomeScene && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: "var(--gradient-hero-glow)" }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero-wash)" }} />
          </>
        )}
        {useHomeScene ? (
          <>
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isDarkArtwork
                  ? "radial-gradient(circle at 76% 22%, rgba(214, 226, 247, 0.16) 0%, rgba(20, 28, 40, 0) 46%)"
                  : "radial-gradient(circle at 78% 18%, rgba(255, 248, 239, 0.82) 0%, rgba(255, 255, 255, 0) 52%)",
              }}
            />
            <img
              src={homeOrbArt}
              alt=""
              aria-hidden="true"
              className={isDarkArtwork
                ? "pointer-events-none absolute right-[18px] top-[34px] w-[112px] md:right-[74px] md:top-[54px] md:w-[96px] lg:right-[92px] lg:top-[62px] lg:w-[108px]"
                : "pointer-events-none absolute right-[14px] top-[14px] w-[118px] opacity-95 md:right-[72px] md:top-[46px] md:w-[92px] lg:right-[88px] lg:top-[54px] lg:w-[104px]"}
              style={{ opacity: isDarkArtwork ? 0.72 : 0.95 }}
            />
            <img
              src={ridgeArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 bottom-[1px] w-[200%] max-w-none -translate-x-1/2 md:bottom-[-10px] md:w-[120%] lg:bottom-[-14px] lg:w-[112%]"
              style={{
                opacity: isDarkArtwork ? 0.96 : 0.98,
                filter: isDarkArtwork
                  ? "brightness(0.88) contrast(1.04)"
                  : "brightness(0.94) contrast(1.02)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-[-20px] top-[40px] overflow-hidden md:inset-x-0 md:top-[72px] lg:top-[84px]"
              aria-hidden="true"
            >
              <div className="hero-cloud-scroll flex w-[200%]">
                <img
                  src={skyArt}
                  alt=""
                  className="hero-cloud-scroll-item block w-1/2 max-w-none shrink-0"
                  style={{
                    opacity: isDarkArtwork ? 0.82 : 0.96,
                    filter: isDarkArtwork
                      ? "brightness(1.08) contrast(1.02)"
                      : "brightness(1.02)",
                  }}
                />
                <img
                  src={skyArt}
                  alt=""
                  className="hero-cloud-scroll-item block w-1/2 max-w-none shrink-0"
                  style={{
                    opacity: isDarkArtwork ? 0.74 : 0.88,
                    filter: isDarkArtwork
                      ? "brightness(1.08) contrast(1.02)"
                      : "brightness(1.02)",
                  }}
                />
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-[18px] h-[132px] md:bottom-[6px] md:h-[156px] lg:bottom-0 lg:h-[164px]"
              style={{
                background: isDarkArtwork
                  ? "linear-gradient(180deg, rgba(17, 28, 42, 0) 0%, rgba(17, 28, 42, 0.18) 100%)"
                  : "linear-gradient(180deg, rgba(160, 102, 66, 0) 0%, rgba(160, 102, 66, 0.12) 100%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-[-10%] top-[122px] h-[164px] md:inset-x-0 md:top-[182px] md:h-[146px] lg:top-[194px] lg:h-[154px]"
              style={{ background: "var(--gradient-hero-ridge)", opacity: isDarkArtwork ? 0.48 : 0.34 }}
            />
          </>
        ) : useSleepScene ? (
          <>
            <img
              src={sceneBackgroundArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-10%] top-[-36px] w-[124%] max-w-none opacity-70 md:inset-x-0 md:top-[8px] md:w-full lg:top-[4px]"
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
              className="pointer-events-none absolute right-[-4%] bottom-[90px] w-[74%] max-w-none md:right-[5%] md:bottom-[58px] md:w-[46%] lg:right-[7%] lg:bottom-[54px] lg:w-[44%]"
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
              className="pointer-events-none absolute inset-x-[-12%] top-[-44px] w-[128%] max-w-none opacity-72 md:inset-x-0 md:top-[4px] md:w-full"
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
              className="pointer-events-none absolute right-[-6%] bottom-[26px] w-[82%] max-w-none md:right-[4%] md:bottom-[14px] md:w-[50%] lg:right-[6%] lg:w-[47%]"
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
              className="pointer-events-none absolute inset-x-[-12%] top-[-42px] w-[126%] max-w-none opacity-72 md:inset-x-0 md:top-[4px] md:w-full"
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
              className="pointer-events-none absolute right-[-14%] bottom-[10px] w-[76%] max-w-none md:right-[1%] md:bottom-[4px] md:w-[48%] lg:right-[3%] lg:w-[45%]"
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
              className="pointer-events-none absolute inset-x-[-12%] top-[-42px] w-[126%] max-w-none opacity-72 md:inset-x-0 md:top-[4px] md:w-full"
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
              className="pointer-events-none absolute right-[-10%] bottom-[20px] w-[72%] max-w-none md:right-[2%] md:bottom-[6px] md:w-[45%] lg:right-[4%] lg:w-[42%]"
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
              className="pointer-events-none absolute inset-x-[-12%] top-[-42px] w-[126%] max-w-none opacity-72 md:inset-x-0 md:top-[4px] md:w-full"
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
              className="pointer-events-none absolute right-[1%] bottom-[72px] w-[44%] max-w-none md:right-[7%] md:bottom-[48px] md:w-[28%] lg:right-[8%] lg:w-[26%]"
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
              className="pointer-events-none absolute inset-x-[-12%] top-[-42px] w-[126%] max-w-none opacity-72 md:inset-x-0 md:top-[4px] md:w-full"
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
              className="pointer-events-none absolute right-[-1%] bottom-[24px] w-[32%] max-w-none md:right-[7%] md:bottom-[20px] md:w-[26%] lg:right-[8%] lg:w-[24%]"
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
            className="w-full px-4 md:px-6 lg:px-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 max-w-[18rem] md:max-w-[23rem] lg:max-w-[25rem]">
                <h1 className="font-[var(--font-display)] text-[2.05rem] font-extrabold leading-[1.1] tracking-[-0.05em] text-[var(--color-hero-title)] md:text-[2.5rem] lg:text-[2.8rem]">
                  {title}
                </h1>
                <p className="mt-2 text-[0.98rem] leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1.08rem]">
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
