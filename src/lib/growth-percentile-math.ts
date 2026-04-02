import { formatOrdinal } from "./growth-reference.ts";

export interface LmsValues {
  l: number;
  m: number;
  s: number;
}

export function getAgeInMonths(dateOfBirth: string, measuredAt: string): number {
  const birth = new Date(dateOfBirth);
  const measurement = new Date(measuredAt);
  const diffMs = measurement.getTime() - birth.getTime();

  if (diffMs <= 0) return 0;

  return diffMs / (1000 * 60 * 60 * 24 * (365.2425 / 12));
}

export function calculateZScore(value: number, lms: LmsValues): number {
  if (lms.l === 0) {
    return Math.log(value / lms.m) / lms.s;
  }

  return (Math.pow(value / lms.m, lms.l) - 1) / (lms.l * lms.s);
}

export function normalCdf(zScore: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(zScore));
  const d = 0.3989423 * Math.exp((-zScore * zScore) / 2);
  const probability = 1 - d * t * (
    0.3193815
    + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))
  );

  return zScore >= 0 ? probability : 1 - probability;
}

export function formatPercentileRank(percentile: number): string {
  const rounded = Math.round(percentile);

  if (rounded <= 1) return "<1st percentile";
  if (rounded >= 99) return ">99th percentile";
  return `${formatOrdinal(rounded)} percentile`;
}
