import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { getChildStatus } from "../../lib/tauri";
import { getAgeLabelFromDob } from "../../lib/utils";
import { FEEDING_TYPES } from "../../lib/constants";
import type { Child } from "../../lib/types";

interface NormalRangeIntroProps {
  child: Child;
  onFinish: () => Promise<void>;
  getChildStatusAction?: typeof getChildStatus;
  navigateAction?: (to: string, options?: { replace?: boolean }) => void;
}

export function NormalRangeIntro({
  child,
  onFinish,
  getChildStatusAction = getChildStatus,
  navigateAction,
}: NormalRangeIntroProps) {
  const navigate = useNavigate();
  const [normalDesc, setNormalDesc] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getChildStatusAction(child.date_of_birth, child.feeding_type, null).then(
      ([_, desc]) => {
        setNormalDesc(desc);
        setIsLoading(false);
      },
    );
  }, [child, getChildStatusAction]);

  const handleFinish = async () => {
    await onFinish();
    (navigateAction ?? navigate)("/", { replace: true });
  };

  const feedingLabel =
    FEEDING_TYPES.find((f) => f.value === child.feeding_type)?.label ?? child.feeding_type;
  const ageLabel = getAgeLabelFromDob(child.date_of_birth);

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
        className="flex justify-center mb-6"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
          style={{ backgroundColor: child.avatar_color }}
        >
          {child.name.charAt(0).toUpperCase()}
        </div>
      </motion.div>

      <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-text)] mb-2 text-center">
        Great! Here's what's normal for {child.name}
      </h2>

      <div className="flex justify-center gap-2 mb-6">
        <Badge variant="info">{ageLabel}</Badge>
        <Badge variant="default">{feedingLabel}</Badge>
      </div>

      {!isLoading && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="mb-6">
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-healthy-bg)] flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-healthy)" className="w-5 h-5">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)] mb-1">
                    Normal range
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {normalDesc}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-info-bg)] flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-info)" className="w-5 h-5">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)] mb-1">
                    We'll keep watch
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    We'll alert you if {child.name}'s patterns fall outside the normal range, and flag any colors that need attention.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="mt-auto pb-8">
        <Button variant="cta" size="lg" className="w-full" onClick={handleFinish}>
          Start Tracking
        </Button>
      </div>
    </div>
  );
}
