import { useEffect, useMemo, useState } from "react";
import {
  getEliminationViewSettingKey,
  normalizeEliminationViewPreference,
  resolveEliminationExperience,
  type EliminationExperience,
  type EliminationViewPreference,
} from "../lib/diaper";
import { useDbClient } from "../contexts/DatabaseContext";
import type { Child } from "../lib/types";

export function useEliminationPreference(child: Child | null) {
  const db = useDbClient();
  const [preference, setPreferenceState] = useState<EliminationViewPreference>("auto");
  const [isLoading, setIsLoading] = useState(() => Boolean(child));

  useEffect(() => {
    if (!child) {
      setPreferenceState("auto");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    db.getSetting(getEliminationViewSettingKey(child.id))
      .then((raw) => {
        if (cancelled) return;
        setPreferenceState(
          normalizeEliminationViewPreference(
            child,
            raw === "diaper" || raw === "poop" || raw === "auto" ? raw : "auto",
          ),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [child]);

  const experience: EliminationExperience = useMemo(() => {
    if (!child) {
      return { mode: "poop", navLabel: "Poop", route: "/poop" };
    }
    return resolveEliminationExperience(child, preference);
  }, [child, preference]);

  const setPreference = async (value: EliminationViewPreference) => {
    if (!child) return;
    const normalizedValue = normalizeEliminationViewPreference(child, value);
    setPreferenceState(normalizedValue);
    await db.setSetting(getEliminationViewSettingKey(child.id), normalizedValue);
  };

  return { preference, setPreference, experience, isLoading };
}
