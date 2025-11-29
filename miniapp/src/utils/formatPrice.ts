/**
 * Price formatting utility for MiniApp
 * Uses Intl.NumberFormat for locale-aware formatting
 */

export type CurrencyCode = 'BYN' | 'RUB' | 'UAH' | 'KZT' | 'PLN' | 'EUR' | 'USD';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  decimals: number;
}

const CURRENCY_INFO: Record<CurrencyCode, CurrencyInfo> = {
  BYN: { code: 'BYN', symbol: 'Br', decimals: 2 },
  RUB: { code: 'RUB', symbol: '₽', decimals: 0 },
  UAH: { code: 'UAH', symbol: '₴', decimals: 2 },
  KZT: { code: 'KZT', symbol: '₸', decimals: 0 },
  PLN: { code: 'PLN', symbol: 'zł', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', decimals: 2 },
  USD: { code: 'USD', symbol: '$', decimals: 2 },
};

export interface FormatPriceOptions {
  currency?: CurrencyCode;
  locale?: string;
  showDecimals?: boolean;
  showFree?: boolean;
  freeText?: string;
  emptyText?: string;
}

/**
 * Format price with currency symbol
 */
export function formatPrice(
  value: number | null | undefined,
  options: FormatPriceOptions = {}
): string {
  const {
    currency = 'BYN',
    locale = 'ru-BY',
    showDecimals = false,
    showFree = false,
    freeText = 'Бесплатно',
    emptyText = '—',
  } = options;

  if (value === null || value === undefined) {
    return emptyText;
  }

  if (value === 0 && showFree) {
    return freeText;
  }

  const currencyInfo = CURRENCY_INFO[currency] || CURRENCY_INFO.BYN;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyInfo.code,
      minimumFractionDigits: showDecimals ? currencyInfo.decimals : 0,
      maximumFractionDigits: showDecimals ? currencyInfo.decimals : 0,
    });
    return formatter.format(value);
  } catch {
    return `${value.toLocaleString(locale)} ${currencyInfo.symbol}`;
  }
}

/**
 * Format price with compact notation for large numbers
 */
export function formatPriceCompact(
  value: number | null | undefined,
  currency: CurrencyCode = 'BYN',
  locale: string = 'ru-BY'
): string {
  if (value === null || value === undefined) {
    return '—';
  }

  const currencyInfo = CURRENCY_INFO[currency] || CURRENCY_INFO.BYN;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    });
    return `${formatter.format(value)} ${currencyInfo.symbol}`;
  } catch {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${currencyInfo.symbol}`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K ${currencyInfo.symbol}`;
    }
    return `${value} ${currencyInfo.symbol}`;
  }
}

/**
 * Format price for display in cards (short format)
 */
export function formatCardPrice(
  value: number | null | undefined,
  currency: CurrencyCode = 'BYN',
  isFree: boolean = false
): string {
  if (isFree || value === 0) {
    return 'Бесплатно';
  }

  if (value === null || value === undefined) {
    return '—';
  }

  const currencyInfo = CURRENCY_INFO[currency] || CURRENCY_INFO.BYN;

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ${currencyInfo.symbol}`;
  }

  if (value >= 10000) {
    return `${Math.round(value / 1000)}K ${currencyInfo.symbol}`;
  }

  return `${value.toLocaleString('ru-RU')} ${currencyInfo.symbol}`;
}

/**
 * Format price range
 */
export function formatPriceRange(
  min: number,
  max: number,
  currency: CurrencyCode = 'BYN',
  locale: string = 'ru-BY'
): string {
  if (min === max) {
    return formatPrice(min, { currency, locale });
  }

  const minFormatted = formatPrice(min, { currency, locale });
  const maxFormatted = formatPrice(max, { currency, locale });

  return `${minFormatted} — ${maxFormatted}`;
}

/**
 * Get currency symbol by code
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCY_INFO[currency]?.symbol || '$';
}

/**
 * Parse price string to number
 */
export function parsePrice(priceString: string | null | undefined): number {
  if (!priceString) return 0;

  const cleaned = String(priceString)
    .replace(/[^\d.,\-]/g, '')
    .replace(',', '.');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export { CURRENCY_INFO };
