import bottleIcon from "../../assets/svg-assets/icons/bottle-icon.svg";
import bottlefeedIcon from "../../assets/svg-assets/icons/bottlefeed-icon.svg";
import breastfeedIcon from "../../assets/svg-assets/icons/breastfeed-icon.svg";
import diaperIcon from "../../assets/svg-assets/icons/diaper-icon.svg";
import diaperIcon2 from "../../assets/svg-assets/icons/diaper-icon-2.svg";
import episodeIcon from "../../assets/svg-assets/icons/episode-icon.svg";
import moonIcon from "../../assets/svg-assets/icons/moon-icon.svg";
import rainbowIcon from "../../assets/svg-assets/icons/rainbow-icon.svg";
import sunIcon from "../../assets/svg-assets/icons/sun-icon.svg";
import symptomIcon from "../../assets/svg-assets/icons/symptom-icon.svg";

interface IconProps {
  className?: string;
  color?: string;
}

interface StrokeIconProps {
  className?: string;
}

function SvgAssetIcon({ src, className }: { src: string; className: string }) {
  return <img src={src} alt="" aria-hidden="true" className={className} />;
}

function MaskAssetIcon({ src, className }: { src: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block ${className}`}
      style={{
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        maskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
      }}
    />
  );
}

export function PoopIcon({ className = "w-5 h-5", color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={color} className={className} aria-hidden="true">
      <path d="M12.5 3C10.5 3 9 4.2 8.5 6c-.7-.2-2.5.3-2.5 2.5 0 1 .5 1.7 1 2C6 11 5 12 5 13.5 5 15.5 6.5 17 8.5 17h7c2 0 3.5-1.5 3.5-3.5 0-1.5-1-2.5-2-3 .5-.3 1-1 1-2 0-1.8-1.5-2.7-2.5-2.5C15 4.2 14.5 3 12.5 3Z" />
      <circle cx="10" cy="12" r="1.2" fill="white" />
      <circle cx="14" cy="12" r="1.2" fill="white" />
      <path d="M10.5 14.5c0 0 .7 1 1.5 1s1.5-1 1.5-1" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function MealIcon({ className = "w-5 h-5", color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={color} className={className} aria-hidden="true">
      <path d="M8 3a1 1 0 0 1 1 1v4a3 3 0 0 1-2 2.83V20a1 1 0 1 1-2 0v-9.17A3 3 0 0 1 3 8V4a1 1 0 1 1 2 0v4a1 1 0 0 0 2 0V4a1 1 0 0 1 1-1Zm6 0a1 1 0 0 1 1 1v5.5c0 1.25.7 2.3 1.7 2.8l.3.2v8.5a1 1 0 1 1-2 0V12.5c0-1.25-.7-2.3-1.7-2.8L13 9.5V4a1 1 0 0 1 1-1Zm5 0a1 1 0 0 1 1 1v6a3 3 0 0 1-2 2.83V20a1 1 0 1 1-2 0v-7.17A3 3 0 0 1 18 10V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function NoPoopIcon({ className = "w-5 h-5", color = "var(--color-muted)" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12.5 3C10.5 3 9 4.2 8.5 6c-.7-.2-2.5.3-2.5 2.5 0 1 .5 1.7 1 2C6 11 5 12 5 13.5 5 15.5 6.5 17 8.5 17h7c2 0 3.5-1.5 3.5-3.5 0-1.5-1-2.5-2-3 .5-.3 1-1 1-2 0-1.8-1.5-2.7-2.5-2.5C15 4.2 14.5 3 12.5 3Z" fill={color} opacity="0.3" />
      <line x1="4" y1="4" x2="20" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function HomeMoodSunIcon({ className = "h-9 w-9" }: StrokeIconProps) {
  return <SvgAssetIcon src={sunIcon} className={className} />;
}

export function HomeMoodRainbowIcon({ className = "h-9 w-9" }: StrokeIconProps) {
  return <SvgAssetIcon src={rainbowIcon} className={className} />;
}

export function HomeMoodMoonIcon({ className = "h-9 w-9" }: StrokeIconProps) {
  return <SvgAssetIcon src={moonIcon} className={className} />;
}

export function HomeSummaryDiaperIcon({ className = "h-7 w-7" }: StrokeIconProps) {
  return <SvgAssetIcon src={diaperIcon} className={className} />;
}

export function HomeSummaryBottleIcon({ className = "h-7 w-7" }: StrokeIconProps) {
  return <SvgAssetIcon src={bottleIcon} className={className} />;
}

export function HomeSummarySleepIcon({ className = "h-7 w-7" }: StrokeIconProps) {
  return <SvgAssetIcon src={moonIcon} className={className} />;
}

export function HomeActionDiaperIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return <MaskAssetIcon src={diaperIcon2} className={className} />;
}

export function HomeActionBottleIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return <MaskAssetIcon src={bottlefeedIcon} className={className} />;
}

export function HomeActionBreastfeedIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return <MaskAssetIcon src={breastfeedIcon} className={className} />;
}

export function HomeActionSleepIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19.5 13.5A7.5 7.5 0 1 1 10.5 4.57a6 6 0 0 0 9 8.93Z" />
      <path d="m16.2 5.1.35.96.96.35-.96.35-.35.96-.35-.96-.96-.35.96-.35.35-.96Z" />
    </svg>
  );
}

export function HomeActionEpisodeIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return <MaskAssetIcon src={episodeIcon} className={className} />;
}

export function HomeActionSymptomIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return <MaskAssetIcon src={symptomIcon} className={className} />;
}

export function HomeToolHistoryIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4.75 12a7.25 7.25 0 1 0 2.12-5.13" />
      <path d="M4.75 5.75v3.5h3.5" />
      <path d="M12 8v4l2.75 1.75" />
    </svg>
  );
}

export function HomeToolGrowthIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5.5 18.5V12.5" />
      <path d="M10 18.5V9" />
      <path d="M14.5 18.5V6.5" />
      <path d="M19 18.5V4.5" />
      <path d="M4 18.5h16" />
    </svg>
  );
}

export function HomeToolMilestonesIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 5.5 14.01 9.57l4.49.65-3.25 3.16.77 4.47L12 15.74 7.98 17.85l.77-4.47-3.25-3.16 4.49-.65L12 5.5Z" />
    </svg>
  );
}

export function HomeToolHandoffIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7.5 12.25c0-1.8 1.45-3.25 3.25-3.25h2.5c1.8 0 3.25 1.45 3.25 3.25" />
      <path d="M4.75 13.5h5.5a2.25 2.25 0 0 1 2.25 2.25v.75H8.75a4 4 0 0 1-4-4v-1.5" />
      <path d="M19.25 13.5h-5.5a2.25 2.25 0 0 0-2.25 2.25v.75h3.75a4 4 0 0 0 4-4v-1.5" />
    </svg>
  );
}
