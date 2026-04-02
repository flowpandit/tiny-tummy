interface IconProps {
  className?: string;
  color?: string;
}

interface StrokeIconProps {
  className?: string;
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
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="9.5" fill="#F6D97B" stroke="#E6B25F" strokeWidth="2" />
      {[
        [24, 5, 24, 11],
        [24, 37, 24, 43],
        [5, 24, 11, 24],
        [37, 24, 43, 24],
        [11.2, 11.2, 15.5, 15.5],
        [32.5, 32.5, 36.8, 36.8],
        [11.2, 36.8, 15.5, 32.5],
        [32.5, 15.5, 36.8, 11.2],
      ].map(([x1, y1, x2, y2], index) => (
        <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F0C98A" strokeWidth="2.4" strokeLinecap="round" />
      ))}
      <path d="M20.5 27.1c.9 1.1 2.1 1.6 3.5 1.6 1.5 0 2.7-.5 3.5-1.6" fill="none" stroke="#9F6F3A" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="20" cy="22" r="1.3" fill="#9F6F3A" />
      <circle cx="28" cy="22" r="1.3" fill="#9F6F3A" />
    </svg>
  );
}

export function HomeMoodRainbowIcon({ className = "h-9 w-9" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M11 30a13 13 0 0 1 26 0" fill="none" stroke="#F08D7E" strokeWidth="4" strokeLinecap="round" />
      <path d="M14 30a10 10 0 0 1 20 0" fill="none" stroke="#F2C97D" strokeWidth="4" strokeLinecap="round" />
      <path d="M17 30a7 7 0 0 1 14 0" fill="none" stroke="#8FC4E8" strokeWidth="4" strokeLinecap="round" />
      <path d="M13 31c0-3.5 2.9-6.4 6.4-6.4 2.3 0 4.2 1 5.3 2.8 1.1-1.8 3-2.8 5.3-2.8 3.5 0 6.4 2.9 6.4 6.4 0 3.1-2.5 5.6-5.6 5.6H18.6A5.6 5.6 0 0 1 13 31Z" fill="#F7F8FB" stroke="#BFD0E6" strokeWidth="1.8" />
    </svg>
  );
}

export function HomeMoodMoonIcon({ className = "h-9 w-9" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M29.8 10.4c-6.8 1.2-12 7.2-12 14.4 0 3.8 1.4 7.2 3.8 9.9-6.3-.7-11.2-6-11.2-12.5 0-7 5.7-12.7 12.7-12.7 2.5 0 4.8.7 6.7 1.9Z" fill="#F4D38A" stroke="#C89749" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m33.5 13 1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1 1-2.4Z" fill="#F4D38A" />
      <path d="m38 19 1.1 2.7 2.7 1.1-2.7 1.1-1.1 2.7-1.1-2.7-2.7-1.1 2.7-1.1L38 19Z" fill="#F8E8BD" />
    </svg>
  );
}

export function HomeSummaryDiaperIcon({ className = "h-7 w-7" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M8 9.5c0 1.4-.3 3-.9 4.5-.8 2-1.1 4-.8 5.9l.3 1.7c.2 1.3 1.3 2.3 2.7 2.3h13.4c1.3 0 2.5-1 2.7-2.3l.3-1.7c.3-1.9 0-3.9-.8-5.9-.6-1.5-.9-3.1-.9-4.5H21c0 2.2-1.8 4-4 4h-2c-2.2 0-4-1.8-4-4H8Z" fill="none" stroke="#93A7B9" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M11 9.5h10" stroke="#93A7B9" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M12.2 18.5c1.3 1.1 2.5 1.6 3.8 1.6 1.3 0 2.5-.5 3.8-1.6" fill="none" stroke="#C7A36B" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function HomeSummaryBottleIcon({ className = "h-7 w-7" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M13 5h6v3.4l1.7 1.8c1 1 1.5 2.3 1.5 3.7V24a3 3 0 0 1-3 3h-6.4a3 3 0 0 1-3-3V13.9c0-1.4.5-2.7 1.5-3.7L13 8.4V5Z" fill="none" stroke="#D9A16D" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 15h8M12 19h8" stroke="#D9A16D" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 5h2" stroke="#D9A16D" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function HomeSummarySleepIcon({ className = "h-7 w-7" }: StrokeIconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M21.9 7.6c-4.8.8-8.4 5-8.4 10 0 2.5.9 4.9 2.6 6.8-4.4-.5-7.8-4.2-7.8-8.7 0-4.9 4-8.9 8.9-8.9 1.7 0 3.3.5 4.7 1.3Z" fill="#D9C8EE" stroke="#A892C8" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m22.8 10.2.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8.8-1.8Z" fill="#EADDF7" />
    </svg>
  );
}
