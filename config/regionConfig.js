/**
 * Country and region configuration for currency and locale mapping.
 * This module keeps the mapping close to ISO codes so it can be reused
 * across the MiniApp, web client, and backend services.
 */

export const COUNTRY_CONFIGS = {
  BY: {
    countryCode: 'BY',
    countryName: 'Беларусь',
    defaultCurrency: 'BYN',
    currencySymbol: 'Br',
    supportedCurrencies: ['BYN', 'USD', 'EUR'],
    defaultLocale: 'ru-BY',
    fallbackLocale: 'en',
    phonePrefix: '+375',
  },
  RU: {
    countryCode: 'RU',
    countryName: 'Россия',
    defaultCurrency: 'RUB',
    currencySymbol: '₽',
    supportedCurrencies: ['RUB', 'USD', 'EUR'],
    defaultLocale: 'ru-RU',
    fallbackLocale: 'en',
    phonePrefix: '+7',
  },
  PL: {
    countryCode: 'PL',
    countryName: 'Polska',
    defaultCurrency: 'PLN',
    currencySymbol: 'zł',
    supportedCurrencies: ['PLN', 'EUR', 'USD'],
    defaultLocale: 'pl-PL',
    fallbackLocale: 'en',
    phonePrefix: '+48',
  },
  UA: {
    countryCode: 'UA',
    countryName: 'Україна',
    defaultCurrency: 'UAH',
    currencySymbol: '₴',
    supportedCurrencies: ['UAH', 'USD', 'EUR'],
    defaultLocale: 'uk-UA',
    fallbackLocale: 'en',
    phonePrefix: '+380',
  },
  KZ: {
    countryCode: 'KZ',
    countryName: 'Казахстан',
    defaultCurrency: 'KZT',
    currencySymbol: '₸',
    supportedCurrencies: ['KZT', 'USD', 'EUR', 'RUB'],
    defaultLocale: 'ru-KZ',
    fallbackLocale: 'en',
    phonePrefix: '+7',
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Deutschland',
    defaultCurrency: 'EUR',
    currencySymbol: '€',
    supportedCurrencies: ['EUR', 'USD'],
    defaultLocale: 'de-DE',
    fallbackLocale: 'en',
    phonePrefix: '+49',
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    defaultCurrency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR'],
    defaultLocale: 'en-US',
    fallbackLocale: 'en',
    phonePrefix: '+1',
  },
};

export const CURRENCY_INFO = {
  BYN: { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль', decimals: 2 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Российский рубль', decimals: 0 },
  UAH: { code: 'UAH', symbol: '₴', name: 'Украинская гривна', decimals: 2 },
  KZT: { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге', decimals: 0 },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
};

export const DEFAULT_REGION_PRESET = {
  countryCode: 'BY',
  currency: 'BYN',
  locale: 'ru-BY',
};

export const REGION_PRESETS = {
  BY: { currency: 'BYN', locale: 'ru-BY' },
  RU: { currency: 'RUB', locale: 'ru-RU' },
  UA: { currency: 'UAH', locale: 'uk-UA' },
  KZ: { currency: 'KZT', locale: 'ru-KZ' },
  PL: { currency: 'PLN', locale: 'pl-PL' },
  DE: { currency: 'EUR', locale: 'de-DE' },
  US: { currency: 'USD', locale: 'en-US' },
  DEFAULT: DEFAULT_REGION_PRESET,
};

/**
 * Get country configuration by country code
 * @param {string} countryCode - ISO country code (BY, RU, etc.)
 * @returns {object} Country configuration
 */
export function getCountryConfig(countryCode) {
  if (!countryCode) {
    return COUNTRY_CONFIGS[DEFAULT_REGION_PRESET.countryCode];
  }

  const normalized = countryCode.toUpperCase();
  const config = COUNTRY_CONFIGS[normalized];

  if (config) {
    return config;
  }

  return {
    countryCode: normalized,
    countryName: normalized,
    defaultCurrency: DEFAULT_REGION_PRESET.currency,
    currencySymbol: CURRENCY_INFO[DEFAULT_REGION_PRESET.currency]?.symbol || '$',
    supportedCurrencies: [DEFAULT_REGION_PRESET.currency],
    defaultLocale: DEFAULT_REGION_PRESET.locale,
    fallbackLocale: 'en',
    phonePrefix: '',
  };
}

/**
 * Get region preset by country code
 * @param {string} countryCode - ISO country code
 * @returns {object} Region preset with currency and locale
 */
export function getRegionPreset(countryCode) {
  const normalized = countryCode?.toUpperCase();
  return REGION_PRESETS[normalized] || REGION_PRESETS.DEFAULT;
}

/**
 * Get currency info by currency code
 * @param {string} currencyCode - ISO currency code (BYN, RUB, etc.)
 * @returns {object} Currency info
 */
export function getCurrencyInfo(currencyCode) {
  return CURRENCY_INFO[currencyCode?.toUpperCase()] || CURRENCY_INFO.USD;
}

/**
 * Get all supported countries as array
 * @returns {array} Array of country configs
 */
export function getAllCountries() {
  return Object.values(COUNTRY_CONFIGS);
}

/**
 * Get all supported currencies as array
 * @returns {array} Array of currency info
 */
export function getAllCurrencies() {
  return Object.values(CURRENCY_INFO);
}

module.exports = {
  COUNTRY_CONFIGS,
  CURRENCY_INFO,
  DEFAULT_REGION_PRESET,
  REGION_PRESETS,
  getCountryConfig,
  getRegionPreset,
  getCurrencyInfo,
  getAllCountries,
  getAllCurrencies,
};
