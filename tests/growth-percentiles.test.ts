import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateZScore,
  formatPercentileRank,
  normalCdf,
  getAgeInMonths,
  getMeasurementFromZScore,
  getZScoreForPercentile,
} from "../src/lib/growth-percentile-math.ts";

test("calculates a z-score from LMS values", () => {
  const zScore = calculateZScore(9.7, {
    l: -0.1600954,
    m: 9.476500305,
    s: 0.11218624,
  });

  assert.ok(Math.abs(zScore - 0.207) < 0.01);
});

test("converts z-scores to percentiles", () => {
  const percentile = normalCdf(0.207) * 100;
  assert.ok(Math.abs(percentile - 58) < 1);
});

test("formats percentile ranks for parent-facing copy", () => {
  assert.equal(formatPercentileRank(50.2), "50th percentile");
  assert.equal(formatPercentileRank(0.4), "<1st percentile");
  assert.equal(formatPercentileRank(99.4), ">99th percentile");
});

test("calculates age in months from dob and measurement date", () => {
  const ageMonths = getAgeInMonths("2024-01-01", "2024-07-01T00:00:00");
  assert.ok(ageMonths > 5.9 && ageMonths < 6.1);
});

test("percentile guide measurements stay in the same measurement units", () => {
  const lms = {
    l: 0.3487,
    m: 3.3464,
    s: 0.14602,
  };
  const p85ZScore = getZScoreForPercentile(85);
  assert.ok(p85ZScore);

  const p50Value = getMeasurementFromZScore(0, lms);
  const p85Value = getMeasurementFromZScore(p85ZScore, lms);

  assert.equal(p50Value, lms.m);
  assert.ok(p85Value > p50Value);
  assert.ok(Math.abs(calculateZScore(p85Value, lms) - p85ZScore) < 0.001);
});
