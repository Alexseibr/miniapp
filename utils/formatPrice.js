/**
 * Price formatting utility with multicurrency support
 * Uses Intl.NumberFormat for locale-aware formatting
 */

const { CURRENCY_INFO, getCurrencyInfo } = require('../config/regionConfig');

/**
 * Format price with currency symbol
 * @param {number} value - Price value
 * @param {string} currencyCode - ISO currency code (BYN, RUB, USD, etc.)
 * @param {string} locale - Locale for formatting (ru-BY, en-US, etc.)
 * @param {object} options - Additional options
 * @returns {string} Formatted price string
 */
function formatPrice(value, currencyCode = 'BYN', locale = 'ru-BY', options = {}) {
  if (value === null || value === undefined) {
    return options.emptyText || '—';
  }

  if (value === 0 && options.showFree) {
    return options.freeText || 'Бесплатно';
  }

  const currency = getCurrencyInfo(currencyCode);
  
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: options.showDecimals ? currency.decimals : 0,
      maximumFractionDigits: options.showDecimals ? currency.decimals : 0,
    });
    
    return formatter.format(value);
  } catch (error) {
    return `${value} ${currency.symbol}`;
  }
}

/**
 * Format price with compact notation for large numbers
 * @param {number} value - Price value
 * @param {string} currencyCode - ISO currency code
 * @param {string} locale - Locale for formatting
 * @returns {string} Compact formatted price
 */
function formatPriceCompact(value, currencyCode = 'BYN', locale = 'ru-BY') {
  if (value === null || value === undefined) {
    return '—';
  }

  const currency = getCurrencyInfo(currencyCode);
  
  try {
    const formatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    });
    
    return `${formatter.format(value)} ${currency.symbol}`;
  } catch (error) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${currency.symbol}`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K ${currency.symbol}`;
    }
    return `${value} ${currency.symbol}`;
  }
}

/**
 * Format price range
 * @param {number} min - Minimum price
 * @param {number} max - Maximum price
 * @param {string} currencyCode - ISO currency code
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted price range
 */
function formatPriceRange(min, max, currencyCode = 'BYN', locale = 'ru-BY') {
  const currency = getCurrencyInfo(currencyCode);
  
  if (min === max) {
    return formatPrice(min, currencyCode, locale);
  }
  
  const minFormatted = formatPrice(min, currencyCode, locale);
  const maxFormatted = formatPrice(max, currencyCode, locale);
  
  return `${minFormatted} — ${maxFormatted}`;
}

/**
 * Get currency symbol by code
 * @param {string} currencyCode - ISO currency code
 * @returns {string} Currency symbol
 */
function getCurrencySymbol(currencyCode) {
  const currency = getCurrencyInfo(currencyCode);
  return currency.symbol;
}

/**
 * Parse price string to number
 * @param {string} priceString - Price string with or without currency
 * @returns {number} Numeric price value
 */
function parsePrice(priceString) {
  if (!priceString) return 0;
  
  const cleaned = String(priceString)
    .replace(/[^\d.,\-]/g, '')
    .replace(',', '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format price for display in cards (short format)
 * @param {number} value - Price value
 * @param {string} currencyCode - ISO currency code
 * @param {boolean} isFree - Whether item is free
 * @returns {string} Short formatted price
 */
function formatCardPrice(value, currencyCode = 'BYN', isFree = false) {
  if (isFree || value === 0) {
    return 'Бесплатно';
  }
  
  const currency = getCurrencyInfo(currencyCode);
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ${currency.symbol}`;
  }
  
  if (value >= 10000) {
    return `${Math.round(value / 1000)}K ${currency.symbol}`;
  }
  
  return `${value.toLocaleString('ru-RU')} ${currency.symbol}`;
}

module.exports = {
  formatPrice,
  formatPriceCompact,
  formatPriceRange,
  getCurrencySymbol,
  parsePrice,
  formatCardPrice,
};
