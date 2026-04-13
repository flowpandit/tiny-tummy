import { useCallback, useEffect, useState } from "react";
import { getDefaultReportDateRange, getReportDateRangeFromLatestActivity } from "../lib/report-view-model";
import { defaultReportOptions, generateReportData, type ReportData, type ReportOptions } from "../lib/reporting";
import type { Child, UnitSystem } from "../lib/types";
import * as db from "../lib/db";

export function useReportPageState(
  activeChild: Child | null,
  unitSystem: UnitSystem,
) {
  const { today, thirtyDaysAgo } = getDefaultReportDateRange();
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions);

  useEffect(() => {
    if (!activeChild) return;

    let cancelled = false;

    void db.getLatestReportActivityDate(activeChild.id).then((latestActivity) => {
      if (cancelled) return;
      const nextRange = getReportDateRangeFromLatestActivity(latestActivity);
      if (!nextRange) return;
      setEndDate(nextRange.endDate);
      setStartDate(nextRange.startDate);
    });

    return () => {
      cancelled = true;
    };
  }, [activeChild]);

  const toggleOption = useCallback((key: keyof ReportOptions) => {
    setOptions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!activeChild) return;

    setIsGenerating(true);
    try {
      const data = await generateReportData(activeChild.id, startDate, endDate, options, unitSystem);
      setReportData(data);
    } finally {
      setIsGenerating(false);
    }
  }, [activeChild, endDate, options, startDate, unitSystem]);

  return {
    today,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    reportData,
    isGenerating,
    options,
    toggleOption,
    handleGenerate,
  };
}
