export type GrowthReference = "WHO" | "CDC";

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

export function detectGrowthCountryCode(): string | null {
  if (typeof navigator === "undefined") return null;

  const locales = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : navigator.language
      ? [navigator.language]
      : [];

  return locales
    .map(getRegionFromLocale)
    .find((value): value is string => Boolean(value)) ?? null;
}

export function getGrowthReference(countryCode: string, ageYears: number): GrowthReference {
  if (countryCode.trim().toUpperCase() === "US") {
    return ageYears < 2 ? "WHO" : "CDC";
  }

  return "WHO";
}

export function getGrowthReferenceForAge(countryCode: string | null, ageYears: number): GrowthReference {
  return getGrowthReference(countryCode ?? "", ageYears);
}

export function formatOrdinal(value: number): string {
  const wholeValue = Math.abs(Math.round(value));
  const lastTwoDigits = wholeValue % 100;
  const lastDigit = wholeValue % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${wholeValue}th`;
  }

  if (lastDigit === 1) return `${wholeValue}st`;
  if (lastDigit === 2) return `${wholeValue}nd`;
  if (lastDigit === 3) return `${wholeValue}rd`;
  return `${wholeValue}th`;
}

export function formatPercentile(
  metric: string,
  percentile: number,
  reference: GrowthReference,
): string {
  return `${metric}: ${formatOrdinal(percentile)} percentile (${reference})`;
}
