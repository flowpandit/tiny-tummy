import cdcHeadRaw from "./growth-data/hcageinf.csv?raw";
import cdcHeightRaw from "./growth-data/statage.csv?raw";
import cdcWeightRaw from "./growth-data/wtage.csv?raw";
import whoBoyHeadRaw from "./growth-data/who-boy-hc.csv?raw";
import whoBoyHeightRaw from "./growth-data/who-boy-length.csv?raw";
import whoBoyWeightRaw from "./growth-data/who-boy-wtage.csv?raw";
import whoGirlHeadRaw from "./growth-data/who-girl-hc.csv?raw";
import whoGirlHeightRaw from "./growth-data/who-girl-length.csv?raw";
import whoGirlWeightRaw from "./growth-data/who-girl-wtage.csv?raw";
import { calculateZScore, formatPercentileRank, getAgeInMonths, getMeasurementFromZScore, getZScoreForPercentile, normalCdf } from "./growth-percentile-math";
import { getGrowthReference, type GrowthReference } from "./growth-reference";
import type { ChildSex, GrowthEntry } from "./types";

export type GrowthMetric = keyof Pick<GrowthEntry, "weight_kg" | "height_cm" | "head_circumference_cm">;

interface LmsPoint {
  ageMonths: number;
  l: number;
  m: number;
  s: number;
}

interface GrowthPercentileInput {
  countryCode: string | null;
  sex: ChildSex | null;
  dateOfBirth: string;
  measuredAt: string;
  metric: GrowthMetric;
  value: number | null;
}

export interface GrowthPercentileCurvePoint {
  ageMonths: number;
  value: number;
  percentile: number;
}

export interface GrowthPercentileResult {
  percentile: number;
  percentileLabel: string;
  zScore: number;
  reference: GrowthReference;
  ageMonths: number;
}

type DatasetMap = Record<GrowthReference, Record<ChildSex, Partial<Record<GrowthMetric, LmsPoint[]>>>>;

const datasets: DatasetMap = {
  WHO: {
    male: {
      weight_kg: parseWhoCsv(whoBoyWeightRaw),
      height_cm: parseWhoCsv(whoBoyHeightRaw),
      head_circumference_cm: parseWhoCsv(whoBoyHeadRaw),
    },
    female: {
      weight_kg: parseWhoCsv(whoGirlWeightRaw),
      height_cm: parseWhoCsv(whoGirlHeightRaw),
      head_circumference_cm: parseWhoCsv(whoGirlHeadRaw),
    },
  },
  CDC: {
    male: {
      weight_kg: parseCdcCsv(cdcWeightRaw, 1),
      height_cm: parseCdcCsv(cdcHeightRaw, 1),
      head_circumference_cm: parseCdcCsv(cdcHeadRaw, 1),
    },
    female: {
      weight_kg: parseCdcCsv(cdcWeightRaw, 2),
      height_cm: parseCdcCsv(cdcHeightRaw, 2),
      head_circumference_cm: parseCdcCsv(cdcHeadRaw, 2),
    },
  },
};

function cleanCsvValue(value: string): string {
  return value.replace(/^\uFEFF/, "").trim();
}

function parseWhoCsv(raw: string): LmsPoint[] {
  const rows = raw.trim().split(/\r?\n/);
  return rows.slice(1)
    .map((line) => line.split(",").map(cleanCsvValue))
    .map(([month, l, m, s]) => ({
      ageMonths: Number.parseFloat(month),
      l: Number.parseFloat(l),
      m: Number.parseFloat(m),
      s: Number.parseFloat(s),
    }));
}

function parseCdcCsv(raw: string, sex: 1 | 2): LmsPoint[] {
  const rows = raw.trim().split(/\r?\n/);
  return rows.slice(1)
    .map((line) => line.split(",").map(cleanCsvValue))
    .filter(([rowSex]) => Number.parseInt(rowSex, 10) === sex)
    .map(([, ageMonths, l, m, s]) => ({
      ageMonths: Number.parseFloat(ageMonths),
      l: Number.parseFloat(l),
      m: Number.parseFloat(m),
      s: Number.parseFloat(s),
    }));
}

function interpolateLms(points: LmsPoint[], ageMonths: number): LmsPoint | null {
  if (points.length === 0) return null;
  if (ageMonths < points[0].ageMonths || ageMonths > points[points.length - 1].ageMonths) {
    return null;
  }

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    if (current.ageMonths === ageMonths) return current;

    const next = points[index + 1];
    if (!next) return current;
    if (ageMonths > current.ageMonths && ageMonths < next.ageMonths) {
      const ratio = (ageMonths - current.ageMonths) / (next.ageMonths - current.ageMonths);
      return {
        ageMonths,
        l: current.l + (next.l - current.l) * ratio,
        m: current.m + (next.m - current.m) * ratio,
        s: current.s + (next.s - current.s) * ratio,
      };
    }
  }

  return points[points.length - 1] ?? null;
}

function getDatasetBounds(points: LmsPoint[]): { minAgeMonths: number; maxAgeMonths: number } | null {
  if (points.length === 0) return null;
  return {
    minAgeMonths: points[0].ageMonths,
    maxAgeMonths: points[points.length - 1].ageMonths,
  };
}

export function getGrowthPercentile(input: GrowthPercentileInput): GrowthPercentileResult | null {
  if (!input.sex || input.value === null || input.value <= 0) return null;

  const ageMonths = getAgeInMonths(input.dateOfBirth, input.measuredAt);
  const reference = getGrowthReference(input.countryCode ?? "", ageMonths / 12);
  const points = datasets[reference][input.sex][input.metric];
  if (!points) return null;

  const interpolated = interpolateLms(points, ageMonths);
  if (!interpolated) return null;

  const zScore = calculateZScore(input.value, interpolated);
  const percentile = Math.max(0, Math.min(100, normalCdf(zScore) * 100));

  return {
    percentile,
    percentileLabel: formatPercentileRank(percentile),
    zScore,
    reference,
    ageMonths,
  };
}

export function getGrowthPercentileCurve(input: {
  countryCode: string | null;
  sex: ChildSex | null;
  metric: GrowthMetric;
  ageMonthsStart: number;
  ageMonthsEnd: number;
  percentiles: number[];
  samples?: number;
}): { reference: GrowthReference; curves: Record<number, GrowthPercentileCurvePoint[]> } | null {
  if (!input.sex) return null;

  const reference = getGrowthReference(input.countryCode ?? "", input.ageMonthsEnd / 12);
  const points = datasets[reference][input.sex][input.metric];
  if (!points || points.length === 0) return null;

  const bounds = getDatasetBounds(points);
  if (!bounds) return null;

  const start = Math.max(bounds.minAgeMonths, input.ageMonthsStart);
  const end = Math.min(bounds.maxAgeMonths, input.ageMonthsEnd);
  if (end <= start) return null;

  const samples = Math.max(8, input.samples ?? 24);
  const curves = Object.fromEntries(
    input.percentiles.map((percentile) => [percentile, [] as GrowthPercentileCurvePoint[]]),
  ) as Record<number, GrowthPercentileCurvePoint[]>;

  for (let index = 0; index < samples; index += 1) {
    const ageMonths = start + ((end - start) * index) / (samples - 1);
    const lms = interpolateLms(points, ageMonths);
    if (!lms) continue;

    for (const percentile of input.percentiles) {
      const zScore = getZScoreForPercentile(percentile);
      if (zScore === null) continue;

      curves[percentile].push({
        ageMonths,
        value: getMeasurementFromZScore(zScore, lms),
        percentile,
      });
    }
  }

  return { reference, curves };
}
