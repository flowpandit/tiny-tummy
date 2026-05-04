import { motion } from "framer-motion";

export function LogSuccess() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-5">
      {/* Checkmark animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-20 h-20 rounded-full bg-[var(--color-healthy)] flex items-center justify-center mb-4"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-10 h-10"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <motion.path d="M5 13l4 4L19 7" />
        </motion.svg>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-semibold text-[var(--color-text)]"
      >
        Logged!
      </motion.p>

      {/* Celebration particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: [
                "var(--color-healthy)",
                "var(--color-cta)",
                "var(--color-primary)",
                "var(--color-caution)",
              ][i % 4],
              left: `${50 + Math.cos((i * Math.PI) / 4) * 10}%`,
              top: "50%",
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{
              scale: [0, 1, 0.5],
              opacity: [1, 1, 0],
              x: Math.cos((i * Math.PI) / 4) * 80,
              y: Math.sin((i * Math.PI) / 4) * 80 - 40,
            }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          />
        ))}
      </div>
    </div>
  );
}
