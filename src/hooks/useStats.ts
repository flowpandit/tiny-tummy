import { useState, useEffect, useCallback } from "react";
import type { DailyFrequency, ConsistencyPoint, ColorCount } from "../lib/types";
import * as db from "../lib/db";

export function useStats(childId: string | null, days: number) {
  const [frequency, setFrequency] = useState<DailyFrequency[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyPoint[]>([]);
  const [colorDist, setColorDist] = useState<ColorCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setFrequency([]);
      setConsistency([]);
      setColorDist([]);
      return;
    }
    setIsLoading(true);
    try {
      const [freq, cons, colors] = await Promise.all([
        db.getFrequencyStats(childId, days),
        db.getConsistencyTrend(childId, days),
        db.getColorDistribution(childId, days),
      ]);
      setFrequency(freq);
      setConsistency(cons);
      setColorDist(colors);
    } catch {
      setFrequency([]);
      setConsistency([]);
      setColorDist([]);
    }
    setIsLoading(false);
  }, [childId, days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { frequency, consistency, colorDist, isLoading, refresh };
}
