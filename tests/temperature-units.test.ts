import test from "node:test";
import assert from "node:assert/strict";
import {
  formatTemperatureValue,
  getDefaultTemperatureUnit,
  parseTemperatureInputToCelsius,
} from "../src/lib/units";

test("temperature unit defaults follow the main unit system", () => {
  assert.equal(getDefaultTemperatureUnit("metric"), "celsius");
  assert.equal(getDefaultTemperatureUnit("imperial"), "fahrenheit");
});

test("temperature parsing stores celsius for either display unit", () => {
  assert.equal(parseTemperatureInputToCelsius("38.2", "celsius"), 38.2);
  assert.equal(parseTemperatureInputToCelsius("100.4", "fahrenheit"), 38);
});

test("temperature formatting respects the selected temperature unit", () => {
  assert.equal(formatTemperatureValue(38, "celsius"), "38.0 °C");
  assert.equal(formatTemperatureValue(38, "fahrenheit"), "100.4 °F");
});
