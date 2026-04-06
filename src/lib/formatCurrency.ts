/**
 * Unified currency formatting utilities.
 *
 * All revenue / target values from Google Sheets are in raw CNY (元).
 * Display format: ¥ + thousands-separated integer (e.g. ¥1,371).
 */

function getCurrencySymbol(): string {
  if (typeof window !== "undefined" && localStorage.getItem("app-currency") === "USD") {
    return "$";
  }

  return "¥";
}

/**
 * Format a raw value with the currency symbol and thousands separators.
 *
 * Examples: 0 → ¥0, 1371 → ¥1,371, 1490000 → ¥1,490,000
 */
export function formatRevenue(value: number): string {
  const symbol = getCurrencySymbol();
  return `${symbol}${Math.round(value).toLocaleString()}`;
}

/**
 * Alias kept for call-site compatibility — identical to formatRevenue.
 */
export function formatCompactRevenue(value: number): string {
  return formatRevenue(value);
}
