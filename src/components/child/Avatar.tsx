import { useAvatar } from "../../hooks/useAvatar";
import { cn } from "../../lib/cn";

interface AvatarProps {
  childId: string;
  name: string;
  color: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "w-8 h-8 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
};

export function Avatar({ childId, name, color, size = "sm", className }: AvatarProps) {
  const avatarUrl = useAvatar(childId);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold flex-shrink-0 overflow-hidden",
        SIZE_CLASSES[size],
        className,
      )}
      style={!avatarUrl ? { backgroundColor: color } : undefined}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
