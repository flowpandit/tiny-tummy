import { cn } from "../../lib/cn";
import { STOOL_SIZES } from "../../lib/constants";
import { useTheme } from "../../contexts/ThemeContext";
import { getLoggingChipClassName, getLoggingLabelClassName } from "./logging-form-classnames";
import type { StoolSize } from "../../lib/types";

interface SizePickerProps {
  value: StoolSize | null;
  onChange: (size: StoolSize) => void;
  nightMode?: boolean;
}

export function SizePicker({ value, onChange, nightMode = false }: SizePickerProps) {
  const { resolved } = useTheme();
  const isNight = nightMode || resolved === "night";
  return (
    <div>
      <label className={cn(getLoggingLabelClassName(isNight), "mb-2")}>
        Size
      </label>
      <div className="flex gap-2">
        {STOOL_SIZES.map((size) => (
          <button
            key={size.value}
            type="button"
            onClick={() => onChange(size.value)}
            className={cn(
              "flex-1",
              getLoggingChipClassName(value === size.value, isNight),
            )}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
}
