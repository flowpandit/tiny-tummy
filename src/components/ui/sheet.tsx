import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "../../lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, children, className }: SheetProps) {
  const sheetY = useMotionValue(0);
  const backdropOpacity = useTransform(sheetY, [0, 300], [1, 0]);
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      sheetY.set(0);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, sheetY]);

  const handleDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    } else {
      animate(sheetY, 0, { type: "spring", damping: 30, stiffness: 300 });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            style={{ opacity: backdropOpacity }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}
            style={{ y: sheetY }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[var(--radius-lg)] shadow-[var(--shadow-lg)]",
              "max-h-[85vh] flex flex-col",
              className,
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
                  sheetY.set(info.offset.y);
                }
              }}
              onDragEnd={handleDragEnd}
              style={{ y: 0 }}
            >
              <div className="w-10 h-1 rounded-full bg-[var(--color-muted)]" />
            </motion.div>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
