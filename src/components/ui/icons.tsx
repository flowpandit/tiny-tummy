import bottleIcon from "../../assets/svg-assets/icons/bottle-icon.svg";
import diaperIcon from "../../assets/svg-assets/icons/diaper-icon.svg";
import moonIcon from "../../assets/svg-assets/icons/moon-icon.svg";
import rainbowIcon from "../../assets/svg-assets/icons/rainbow-icon.svg";
import sunIcon from "../../assets/svg-assets/icons/sun-icon.svg";

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
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4.5 9.25C4.5 7.18 6.18 5.5 8.25 5.5h7.5c2.07 0 3.75 1.68 3.75 3.75v2.5c0 3.18-2.57 5.75-5.75 5.75h-3.5c-3.18 0-5.75-2.57-5.75-5.75v-2.5Z" />
      <path d="M7 15.25c.47-1.08 1.41-1.9 2.58-2.23M17 15.25c-.47-1.08-1.41-1.9-2.58-2.23" />
      <path d="M8 5.75V4.5M16 5.75V4.5" />
    </svg>
  );
}

export function HomeActionBottleIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10 3.75h4" />
      <path d="M10.75 3.75v2.1c0 .53-.21 1.04-.59 1.41l-.56.56a3 3 0 0 0-.88 2.12v7.31A2.75 2.75 0 0 0 11.47 20h1.06a2.75 2.75 0 0 0 2.75-2.75V9.94a3 3 0 0 0-.88-2.12l-.56-.56a1.99 1.99 0 0 1-.59-1.41v-2.1" />
      <path d="M9.1 11.5h5.8M9.1 14.5h5.8" />
    </svg>
  );
}

export function HomeActionBreastfeedIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 6.25a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5Z" />
      <path d="M12 10.5h.01" />
      <path d="M8.25 14.25c-1.86.7-3.1 2.24-3.75 4.25M15.75 14.25c1.86.7 3.1 2.24 3.75 4.25" />
    </svg>
  );
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
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6.25 17.75h11.5" />
      <path d="M7.75 13.5V10a4.25 4.25 0 1 1 8.5 0v3.5" />
      <path d="M10.25 17.75V20M13.75 17.75V20" />
      <path d="M12 5.75v1.5" />
    </svg>
  );
}

export function HomeActionSymptomIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 4.75c3.45 0 6.25 2.8 6.25 6.25S15.45 17.25 12 17.25 5.75 14.45 5.75 11 8.55 4.75 12 4.75Z" />
      <path d="M12 8.25v3.25" />
      <path d="M12 14.25h.01" />
      <path d="M8.25 19.25h7.5" />
    </svg>
  );
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
