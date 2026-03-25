interface IconProps {
  className?: string;
  color?: string;
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
