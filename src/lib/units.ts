import type { FeedingEntry, GrowthEntry, TemperatureUnit, UnitSystem } from "./types";

export const UNIT_SYSTEM_SETTING_KEY = "unit_system";
export const TEMPERATURE_UNIT_SETTING_KEY = "temperature_unit";

const ML_PER_FLUID_OUNCE = 29.5735295625;
const LB_PER_KG = 2.2046226218;
const IN_PER_CM = 0.3937007874;
const IMPERIAL_REGIONS = new Set(["US", "LR", "MM"]);

type GrowthMetricKey = keyof Pick<GrowthEntry, "weight_kg" | "height_cm" | "head_circumference_cm">;

function formatNumber(
  value: number,
  options: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {},
): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  }).format(value);
}

function normalizeLocaleTag(locale: string): string {
  return locale.replace(/_/g, "-");
}

function getRegionFromLocale(locale: string): string | null {
  const normalized = normalizeLocaleTag(locale);

  try {
    if (typeof Intl !== "undefined" && "Locale" in Intl) {
      const intlLocale = new Intl.Locale(normalized).maximize();
      if (intlLocale.region) {
        return intlLocale.region.toUpperCase();
      }
    }
  } catch {
    // Fall through to a simpler parser.
  }

  const match = normalized.match(/-([A-Za-z]{2}|\d{3})(?:-|$)/);
  return match ? match[1].toUpperCase() : null;
}

function getBrowserLocales(): string[] {
  if (typeof navigator === "undefined") return [];
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages.filter(Boolean);
  }
  return navigator.language ? [navigator.language] : [];
}

export function detectDefaultUnitSystem(): UnitSystem {
  const region = getBrowserLocales()
    .map(getRegionFromLocale)
    .find((value): value is string => Boolean(value));

  return region && IMPERIAL_REGIONS.has(region) ? "imperial" : "metric";
}

export function getVolumeUnitLabel(unitSystem: UnitSystem): "ml" | "oz" {
  return unitSystem === "imperial" ? "oz" : "ml";
}

export function getDefaultTemperatureUnit(unitSystem: UnitSystem): TemperatureUnit {
  return unitSystem === "imperial" ? "fahrenheit" : "celsius";
}

export function getTemperatureUnitLabel(temperatureUnit: TemperatureUnit): "°C" | "°F" {
  return temperatureUnit === "fahrenheit" ? "°F" : "°C";
}

export function getGrowthUnitLabel(metric: GrowthMetricKey, unitSystem: UnitSystem): "kg" | "cm" | "lb" | "in" {
  if (metric === "weight_kg") {
    return unitSystem === "imperial" ? "lb" : "kg";
  }
  return unitSystem === "imperial" ? "in" : "cm";
}

export function volumeMlToDisplay(ml: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? ml / ML_PER_FLUID_OUNCE : ml;
}

export function volumeDisplayToMl(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? value * ML_PER_FLUID_OUNCE : value;
}

export function temperatureCelsiusToDisplay(celsius: number, temperatureUnit: TemperatureUnit): number {
  return temperatureUnit === "fahrenheit" ? (celsius * 9 / 5) + 32 : celsius;
}

export function temperatureDisplayToCelsius(value: number, temperatureUnit: TemperatureUnit): number {
  return temperatureUnit === "fahrenheit" ? (value - 32) * 5 / 9 : value;
}

export function formatTemperatureValue(
  celsius: number | null,
  temperatureUnit: TemperatureUnit,
  options: {
    includeUnit?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {},
): string {
  if (celsius === null) return "—";

  const value = temperatureCelsiusToDisplay(celsius, temperatureUnit);
  const formatted = formatNumber(value, {
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
    minimumFractionDigits: options.minimumFractionDigits ?? 1,
  });

  return options.includeUnit === false ? formatted : `${formatted} ${getTemperatureUnitLabel(temperatureUnit)}`;
}

export function parseTemperatureInputToCelsius(input: string, temperatureUnit: TemperatureUnit): number | null {
  if (!input.trim()) return null;
  const parsed = Number.parseFloat(input);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(temperatureDisplayToCelsius(parsed, temperatureUnit) * 10) / 10;
}

export function formatVolumeValue(
  ml: number | null,
  unitSystem: UnitSystem,
  options: {
    includeUnit?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {},
): string {
  if (ml === null) return "—";

  const value = volumeMlToDisplay(ml, unitSystem);
  const formatted = formatNumber(value, {
    maximumFractionDigits: options.maximumFractionDigits ?? (unitSystem === "imperial" ? 1 : 0),
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  });

  return options.includeUnit === false ? formatted : `${formatted} ${getVolumeUnitLabel(unitSystem)}`;
}

export function getVolumeDisplayParts(
  ml: number,
  unitSystem: UnitSystem,
  options: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {},
): { value: string; unit: string } {
  return {
    value: formatVolumeValue(ml, unitSystem, { ...options, includeUnit: false }),
    unit: getVolumeUnitLabel(unitSystem),
  };
}

export function parseVolumeInputToMl(input: string, unitSystem: UnitSystem): number | null {
  if (!input.trim()) return null;
  const parsed = Number.parseFloat(input);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(volumeDisplayToMl(parsed, unitSystem));
}

export function growthMetricToDisplay(metric: GrowthMetricKey, value: number, unitSystem: UnitSystem): number {
  if (metric === "weight_kg") {
    return unitSystem === "imperial" ? value * LB_PER_KG : value;
  }
  return unitSystem === "imperial" ? value * IN_PER_CM : value;
}

export function growthMetricFromDisplay(metric: GrowthMetricKey, value: number, unitSystem: UnitSystem): number {
  if (metric === "weight_kg") {
    return unitSystem === "imperial" ? value / LB_PER_KG : value;
  }
  return unitSystem === "imperial" ? value / IN_PER_CM : value;
}

export function formatGrowthValue(
  metric: GrowthMetricKey,
  value: number | null,
  unitSystem: UnitSystem,
  options: {
    includeUnit?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {},
): string {
  if (value === null) return "—";

  const displayValue = growthMetricToDisplay(metric, value, unitSystem);
  const formatted = formatNumber(displayValue, {
    maximumFractionDigits: options.maximumFractionDigits ?? (metric === "weight_kg" ? 1 : 1),
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  });

  return options.includeUnit === false ? formatted : `${formatted} ${getGrowthUnitLabel(metric, unitSystem)}`;
}

export function parseGrowthInputToMetric(metric: GrowthMetricKey, input: string, unitSystem: UnitSystem): number | null {
  if (!input.trim()) return null;
  const parsed = Number.parseFloat(input);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return growthMetricFromDisplay(metric, parsed, unitSystem);
}

export function formatGrowthSummary(entry: GrowthEntry, unitSystem: UnitSystem): string {
  const parts = [
    entry.weight_kg !== null ? formatGrowthValue("weight_kg", entry.weight_kg, unitSystem) : null,
    entry.height_cm !== null ? formatGrowthValue("height_cm", entry.height_cm, unitSystem) : null,
    entry.head_circumference_cm !== null ? `head ${formatGrowthValue("head_circumference_cm", entry.head_circumference_cm, unitSystem)}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Measurement logged";
}

export function formatFeedingAmount(entry: Pick<FeedingEntry, "amount_ml">, unitSystem: UnitSystem): string | null {
  if (entry.amount_ml === null) return null;
  return formatVolumeValue(entry.amount_ml, unitSystem);
}
