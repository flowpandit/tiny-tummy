import { useEffect, useState } from "react";
import { useServices } from "../contexts/DatabaseContext";
import type { ChildCaregiverProfile } from "../lib/caregivers";

export function useCurrentCaregiver(childId: string | null) {
  const { caregivers } = useServices();
  const [currentCaregiver, setCurrentCaregiver] = useState<ChildCaregiverProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!childId) {
      setCurrentCaregiver(null);
      return undefined;
    }

    caregivers.getCurrentCaregiverForChild(childId)
      .then((caregiver) => {
        if (!cancelled) {
          setCurrentCaregiver(caregiver);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentCaregiver(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [caregivers, childId]);

  return currentCaregiver;
}
