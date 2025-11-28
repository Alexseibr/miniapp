/**
 * Formats prices consistently using the Intl.NumberFormat API.
 * The function never throws and always returns a string.
 */
export function formatPrice({ value, currency, locale }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeCurrency = currency || 'USD';
  const safeLocale = locale || 'en-US';

  try {
    return new Intl.NumberFormat(safeLocale, {
      style: 'currency',
      currency: safeCurrency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch (err) {
    return `${safeValue} ${safeCurrency}`;
  }
}
