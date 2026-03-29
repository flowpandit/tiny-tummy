import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/cn";
import { STOOL_COLORS } from "../../lib/constants";
import { useTheme } from "../../contexts/ThemeContext";
import type { StoolColor } from "../../lib/types";

interface ColorPickerProps {
  value: StoolColor | null;
  onChange: (color: StoolColor) => void;
  nightMode?: boolean;
}

export function ColorPicker({ value, onChange, nightMode = false }: ColorPickerProps) {
  const { resolved } = useTheme();
  const isNight = nightMode || resolved === "night";
  const selectedInfo = value ? STOOL_COLORS.find((c) => c.value === value) : null;

  return (
    <div>
      <label className={cn("block text-sm font-medium mb-2", isNight ? "text-slate-100" : "text-[var(--color-text)]")}>
        Color
      </label>
      <div className="flex gap-3 justify-center">
        {STOOL_COLORS.map((color) => {
          const needsBorder = color.value === "white" || color.value === "black";
          return (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              className={cn(
                "w-10 h-10",
                "rounded-full cursor-pointer transition-transform duration-200 border-2",
                value === color.value
                  ? "scale-110 border-[var(--color-primary)]"
                  : needsBorder
                    ? isNight ? "border-slate-600 hover:scale-105" : "border-[var(--color-border)] hover:scale-105"
                    : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: color.hex }}
              aria-label={`${color.label}${color.isRedFlag ? " (red flag)" : ""}`}
            />
          );
        })}
      </div>

      {/* Description for any selected color */}
      <AnimatePresence mode="wait">
        {selectedInfo && (
          <motion.div
            key={selectedInfo.value}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-2 rounded-[var(--radius-sm)] border",
                isNight ? "p-3" : "p-2.5",
                selectedInfo.isRedFlag
                  ? "bg-[var(--color-alert-bg)] border-[var(--color-alert)]/20"
                  : isNight
                    ? "bg-slate-900 border-slate-700"
                    : "bg-[var(--color-healthy-bg)] border-[var(--color-healthy)]/20",
              )}
            >
              <div className="flex items-start gap-2">
                {/* Color dot + label */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 border border-[var(--color-border)]"
                  style={{ backgroundColor: selectedInfo.hex }}
                />
                <div>
                  <p
                    className={cn(
                      "text-xs font-semibold mb-0.5",
                      selectedInfo.isRedFlag
                        ? "text-[var(--color-alert)]"
                        : isNight
                          ? "text-slate-100"
                          : "text-[var(--color-healthy)]",
                    )}
                  >
                    {selectedInfo.label}
                    {selectedInfo.isRedFlag && " — Red Flag"}
                  </p>
                  <p
                    className={cn(
                      "text-xs leading-relaxed",
                      selectedInfo.isRedFlag
                        ? "text-[var(--color-alert)]"
                        : isNight
                          ? "text-slate-300"
                          : "text-[var(--color-text-secondary)]",
                    )}
                  >
                    {selectedInfo.description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
