import { useState, useEffect, useCallback, useRef } from "react";
import type { DailyFrequency, ConsistencyPoint, ColorCount } from "../lib/types";
import * as db from "../lib/db";

export function useStats(childId: string | null, days: number) {
  const [frequency, setFrequency] = useState<DailyFrequency[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyPoint[]>([]);
  const [colorDist, setColorDist] = useState<ColorCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!childId) {
      setFrequency([]);
      setConsistency([]);
      setColorDist([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [freq, cons, colors] = await Promise.all([
        db.getFrequencyStats(childId, days),
        db.getConsistencyTrend(childId, days),
        db.getColorDistribution(childId, days),
      ]);

      if (requestId !== requestIdRef.current) return;
      setFrequency(freq);
      setConsistency(cons);
      setColorDist(colors);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setFrequency([]);
      setConsistency([]);
      setColorDist([]);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [childId, days]);

  useEffect(() => {
    setFrequency([]);
    setConsistency([]);
    setColorDist([]);
    setIsLoading(Boolean(childId));
    void refresh();
  }, [childId, days, refresh]);

  return { frequency, consistency, colorDist, isLoading, refresh };
}
