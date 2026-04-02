import test from "node:test";
import assert from "node:assert/strict";
import { formatOrdinal, formatPercentile, getGrowthReference, getGrowthReferenceForAge } from "../src/lib/growth-reference.ts";

test("uses WHO globally by default", () => {
  assert.equal(getGrowthReference("AU", 4), "WHO");
  assert.equal(getGrowthReference("GB", 8), "WHO");
});

test("falls back to WHO when no country code is available", () => {
  assert.equal(getGrowthReferenceForAge(null, 3), "WHO");
});

test("uses WHO for US children under age 2", () => {
  assert.equal(getGrowthReference("US", 0), "WHO");
  assert.equal(getGrowthReference("us", 1.99), "WHO");
});

test("uses CDC for US children age 2 and older", () => {
  assert.equal(getGrowthReference("US", 2), "CDC");
  assert.equal(getGrowthReference("US", 6), "CDC");
});

test("formats ordinal suffixes correctly", () => {
  assert.equal(formatOrdinal(1), "1st");
  assert.equal(formatOrdinal(2), "2nd");
  assert.equal(formatOrdinal(3), "3rd");
  assert.equal(formatOrdinal(4), "4th");
  assert.equal(formatOrdinal(11), "11th");
  assert.equal(formatOrdinal(12), "12th");
  assert.equal(formatOrdinal(13), "13th");
  assert.equal(formatOrdinal(21), "21st");
  assert.equal(formatOrdinal(22), "22nd");
  assert.equal(formatOrdinal(23), "23rd");
});

test("rounds percentile values for parent-facing display", () => {
  assert.equal(formatOrdinal(61.4), "61st");
  assert.equal(formatOrdinal(61.6), "62nd");
});

test("formats the final percentile label", () => {
  assert.equal(formatPercentile("Weight", 61, "WHO"), "Weight: 61st percentile (WHO)");
  assert.equal(formatPercentile("Height", 62, "CDC"), "Height: 62nd percentile (CDC)");
});
