import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useIsPresent, type MotionValue } from "framer-motion";
import { cn } from "../../lib/cn";
import { useTheme } from "../../contexts/ThemeContext";

// Shared visibility contract for sheet-style feature components.
export interface SheetVisibilityProps {
  open: boolean;
  onClose: () => void;
}

interface SheetProps extends SheetVisibilityProps {
  children: ReactNode;
  className?: string;
  tone?: "default" | "night";
}

export function Sheet({ open, onClose, children, className, tone = "default" }: SheetProps) {
  const { resolved } = useTheme();
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 300], [1, 0]);
  const effectiveTone = tone === "night" || (tone === "default" && resolved === "night") ? "night" : "default";

  useEffect(() => {
    if (open) {
      dragY.set(0);
    }
  }, [open, dragY]);

  const handleDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    } else {
      animate(dragY, 0, { type: "spring", damping: 30, stiffness: 300 });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <SheetContent
          backdropOpacity={backdropOpacity}
          className={className}
          effectiveTone={effectiveTone}
          onClose={onClose}
          onDragEnd={handleDragEnd}
          dragY={dragY}
        >
          {children}
        </SheetContent>
      )}
    </AnimatePresence>
  );
}

interface SheetContentProps {
  backdropOpacity: MotionValue<number>;
  children: ReactNode;
  className?: string;
  effectiveTone: "default" | "night";
  onClose: () => void;
  onDragEnd: (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => void;
  dragY: MotionValue<number>;
}

function SheetContent({
  backdropOpacity,
  children,
  className,
  dragY,
  effectiveTone,
  onClose,
  onDragEnd,
}: SheetContentProps) {
  const isPresent = useIsPresent();

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const scrollRoot = document.querySelector('[data-scroll-root="true"]');

    const lockCount = Number(body.dataset.sheetLockCount ?? "0");
    body.dataset.sheetLockCount = String(lockCount + 1);

    if (lockCount === 0) {
      body.dataset.sheetBodyOverflow = body.style.overflow;
      html.dataset.sheetHtmlOverflow = html.style.overflow;
      body.style.overflow = "hidden";
      html.style.overflow = "hidden";

      if (scrollRoot instanceof HTMLElement) {
        scrollRoot.dataset.sheetOverflow = scrollRoot.style.overflow;
        scrollRoot.dataset.sheetOverscrollBehavior = scrollRoot.style.overscrollBehavior;
        scrollRoot.style.overflow = "hidden";
        scrollRoot.style.overscrollBehavior = "none";
      }
    }

    return () => {
      const nextLockCount = Math.max(0, Number(body.dataset.sheetLockCount ?? "1") - 1);
      body.dataset.sheetLockCount = String(nextLockCount);

      if (nextLockCount === 0) {
        body.style.overflow = body.dataset.sheetBodyOverflow ?? "";
        html.style.overflow = html.dataset.sheetHtmlOverflow ?? "";
        delete body.dataset.sheetBodyOverflow;
        delete html.dataset.sheetHtmlOverflow;

        if (scrollRoot instanceof HTMLElement) {
          scrollRoot.style.overflow = scrollRoot.dataset.sheetOverflow ?? "";
          scrollRoot.style.overscrollBehavior = scrollRoot.dataset.sheetOverscrollBehavior ?? "";
          delete scrollRoot.dataset.sheetOverflow;
          delete scrollRoot.dataset.sheetOverscrollBehavior;
        }
      }
    };
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className={cn(
          "fixed inset-0 z-40",
          effectiveTone === "night" ? "bg-[#020617]/75" : "bg-black/40",
        )}
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{
          type: "tween",
          duration: isPresent ? 0.17 : 0.16,
          ease: isPresent ? [0.16, 1, 0.3, 1] : [0.4, 0, 1, 1],
        }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-[var(--radius-lg)] shadow-[var(--shadow-lg)] transform-gpu will-change-transform",
          className,
        )}
      >
        <motion.div
          style={{ y: dragY }}
          className={cn(
            "max-h-[85vh] flex flex-col rounded-t-[var(--radius-lg)]",
            effectiveTone === "night"
              ? "border border-slate-700/70 bg-[#0f172a] text-slate-100"
              : "border border-[var(--color-border)] bg-[var(--color-surface-strong)]",
          )}
        >
          {/* Drag handle — only this area is draggable */}
          <motion.div
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0 touch-none"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.4 }}
            dragMomentum={false}
            onDrag={(_, info) => {
              if (info.offset.y > 0) {
                dragY.set(info.offset.y);
              }
            }}
            onDragEnd={onDragEnd}
          >
            <div className={cn("w-10 h-1 rounded-full", effectiveTone === "night" ? "bg-slate-500" : "bg-[var(--color-muted)]")} />
          </motion.div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
