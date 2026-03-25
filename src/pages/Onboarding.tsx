import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Welcome } from "../components/onboarding/Welcome";
import { AddChildStep } from "../components/onboarding/AddChildStep";
import { NormalRangeIntro } from "../components/onboarding/NormalRangeIntro";
import { useChildContext } from "../contexts/ChildContext";
import type { Child } from "../lib/types";

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [newChild, setNewChild] = useState<Child | null>(null);
  const { refreshChildren } = useChildContext();

  const handleChildCreated = (child: Child) => {
    setNewChild(child);
    setStep(2);
  };

  const handleFinish = async () => {
    await refreshChildren();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1"
          >
            <Welcome onNext={() => setStep(1)} />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div
            key="add-child"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1"
          >
            <AddChildStep onChildCreated={handleChildCreated} />
          </motion.div>
        )}
        {step === 2 && newChild && (
          <motion.div
            key="normal-range"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1"
          >
            <NormalRangeIntro child={newChild} onFinish={handleFinish} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step indicators */}
      <div className="flex justify-center gap-2 pb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              i === step ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
