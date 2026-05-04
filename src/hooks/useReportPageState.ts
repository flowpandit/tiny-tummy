import { useCallback, useEffect, useState } from "react";
import { getDefaultReportDateRange, getReportDateRangeFromLatestActivity } from "../lib/report-view-model";
import { defaultReportOptions, generateReportData, type ReportData, type ReportOptions } from "../lib/reporting";
import type { Child, UnitSystem } from "../lib/types";
import { useDbClient } from "../contexts/DatabaseContext";

export function useReportPageState(
  activeChild: Child | null,
  unitSystem: UnitSystem,
) {
  const db = useDbClient();
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

  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value);
    setReportData(null);
  }, []);

  const handleEndDateChange = useCallback((value: string) => {
    setEndDate(value);
    setReportData(null);
  }, []);

  const toggleOption = useCallback((key: keyof ReportOptions) => {
    setOptions((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setReportData(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!activeChild) return null;

    setIsGenerating(true);
    try {
      const data = await generateReportData(activeChild.id, startDate, endDate, options, unitSystem);
      setReportData(data);
      return data;
    } finally {
      setIsGenerating(false);
    }
  }, [activeChild, endDate, options, startDate, unitSystem]);

  return {
    today,
    startDate,
    endDate,
    setStartDate: handleStartDateChange,
    setEndDate: handleEndDateChange,
    reportData,
    isGenerating,
    options,
    toggleOption,
    handleGenerate,
  };
}
