interface LogoProps {
  className?: string;
}

/**
 * Inline SVG logo — avoids Android WebView issues with SVG <text> + external fonts.
 * Shows just the baby face icon without text (text is rendered as HTML below).
 */
export function Logo({ className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      aria-label="Tiny Tummy logo"
      role="img"
    >
      {/* Background rounded square */}
      <rect x="0" y="0" width="512" height="512" rx="115" fill="#FFF0E6" />

      {/* Head / body circle */}
      <circle cx="256" cy="220" r="135" fill="#FFD4B8" />

      {/* Tummy area */}
      <ellipse cx="256" cy="245" rx="90" ry="70" fill="#FFBC94" />

      {/* Belly button */}
      <ellipse cx="256" cy="280" rx="16" ry="10" fill="#F5C9A8" opacity="0.7" />

      {/* Left eye */}
      <circle cx="218" cy="190" r="14" fill="#5C4033" />
      <circle cx="223" cy="186" r="5" fill="#FFFFFF" />

      {/* Right eye */}
      <circle cx="294" cy="190" r="14" fill="#5C4033" />
      <circle cx="299" cy="186" r="5" fill="#FFFFFF" />

      {/* Smile */}
      <path
        d="M228 240 Q256 272 284 240"
        fill="none"
        stroke="#D4845A"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Left cheek blush */}
      <circle cx="192" cy="232" r="20" fill="#FFB8B8" opacity="0.45" />

      {/* Right cheek blush */}
      <circle cx="320" cy="232" r="20" fill="#FFB8B8" opacity="0.45" />
    </svg>
  );
}
