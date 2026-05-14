import {
  bottleIcon,
  bottlefeedIcon,
  breastfeedIcon,
  diaperIcon,
  diaperIcon2,
  moonIcon,
  poopIcon,
  rainbowIcon,
  sunIcon,
  symptomIcon,
} from "../../assets/icons";
import episodeIconSvg from "../../assets/icons/episode-icon.svg?raw";
import growthIconSvg from "../../assets/icons/growth.svg?raw";
import milestoneIconSvg from "../../assets/icons/milestone.svg?raw";
import reportIconSvg from "../../assets/icons/report.svg?raw";
import trendsIconSvg from "../../assets/icons/trends.svg?raw";

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

function colorizeSvg(svg: string) {
  return svg
    .replace(/stroke="black"/g, 'stroke="currentColor"')
    .replace(/fill="#[0-9A-Fa-f]{3,8}"/g, 'fill="currentColor"');
}

function InlineAssetIcon({ svg, className }: { svg: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center [&>svg]:h-full [&>svg]:w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: colorizeSvg(svg) }}
    />
  );
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

export function PoopIcon({ className = "w-5 h-5" }: IconProps) {
  return <SvgAssetIcon src={poopIcon} className={className} />;
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
    <span className={`relative inline-block ${className}`} aria-hidden="true">
      <img src={poopIcon} alt="" className="h-full w-full object-contain opacity-30" />
      <span
        className="absolute left-1/2 top-1/2 h-[120%] w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
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
  return <InlineAssetIcon svg={episodeIconSvg} className={className} />;
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
  return <InlineAssetIcon svg={growthIconSvg} className={className} />;
}

export function HomeToolMilestonesIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return <InlineAssetIcon svg={milestoneIconSvg} className={className} />;
}

export function HomeToolTrendsIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return <InlineAssetIcon svg={trendsIconSvg} className={className} />;
}

export function HomeToolReportIcon({ className = "h-5 w-5" }: StrokeIconProps) {
  return <InlineAssetIcon svg={reportIconSvg} className={className} />;
}
