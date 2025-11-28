/**
 * Country and region configuration for currency and locale mapping.
 * This module keeps the mapping close to ISO codes so it can be reused
 * across the MiniApp, web client, and backend services.
 */
export const COUNTRY_CONFIGS = {
  BY: {
    countryCode: 'BY',
    defaultCurrency: 'BYN',
    supportedCurrencies: ['BYN', 'USD', 'EUR'],
    defaultLocale: 'ru-BY',
    fallbackLocale: 'en',
  },
  RU: {
    countryCode: 'RU',
    defaultCurrency: 'RUB',
    supportedCurrencies: ['RUB', 'USD', 'EUR'],
    defaultLocale: 'ru-RU',
    fallbackLocale: 'en',
  },
  PL: {
    countryCode: 'PL',
    defaultCurrency: 'PLN',
    supportedCurrencies: ['PLN', 'EUR', 'USD'],
    defaultLocale: 'pl-PL',
    fallbackLocale: 'en',
  },
  DE: {
    countryCode: 'DE',
    defaultCurrency: 'EUR',
    supportedCurrencies: ['EUR', 'USD'],
    defaultLocale: 'de-DE',
    fallbackLocale: 'en',
  },
  US: {
    countryCode: 'US',
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR'],
    defaultLocale: 'en-US',
    fallbackLocale: 'en',
  },
};

export const DEFAULT_REGION_PRESET = {
  countryCode: 'ZZ',
  currency: 'USD',
  locale: 'en-US',
};

export const REGION_PRESETS = {
  BY: { currency: 'BYN', locale: 'ru-BY' },
  RU: { currency: 'RUB', locale: 'ru-RU' },
  PL: { currency: 'PLN', locale: 'pl-PL' },
  DE: { currency: 'EUR', locale: 'de-DE' },
  US: { currency: 'USD', locale: 'en-US' },
  DEFAULT: DEFAULT_REGION_PRESET,
};

export function getCountryConfig(countryCode) {
  if (!countryCode) {
    return COUNTRY_CONFIGS[DEFAULT_REGION_PRESET.countryCode] || {
      ...DEFAULT_REGION_PRESET,
      defaultCurrency: DEFAULT_REGION_PRESET.currency,
      supportedCurrencies: [DEFAULT_REGION_PRESET.currency],
      defaultLocale: DEFAULT_REGION_PRESET.locale,
      fallbackLocale: 'en',
    };
  }

  const normalized = countryCode.toUpperCase();
  const config = COUNTRY_CONFIGS[normalized];

  if (config) {
    return config;
  }

  return {
    countryCode: normalized,
    defaultCurrency: DEFAULT_REGION_PRESET.currency,
    supportedCurrencies: [DEFAULT_REGION_PRESET.currency],
    defaultLocale: DEFAULT_REGION_PRESET.locale,
    fallbackLocale: 'en',
  };
}

export function getRegionPreset(countryCode) {
  const normalized = countryCode?.toUpperCase();
  return REGION_PRESETS[normalized] || REGION_PRESETS.DEFAULT;
}
