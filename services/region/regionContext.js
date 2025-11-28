import { getCountryConfig, getRegionPreset, DEFAULT_REGION_PRESET } from '../../config/regionConfig.js';

function parseAcceptLanguageHeader(header) {
  if (!header || typeof header !== 'string') return null;

  const primary = header.split(',')[0]?.trim();
  if (!primary) return null;

  const [language, region] = primary.split('-');
  return {
    language: language?.toLowerCase(),
    country: region ? region.toUpperCase() : null,
  };
}

function normalizeLocale({ locale, language, fallbackLocale }) {
  if (locale) return locale;
  if (language) {
    const normalizedLanguage = language.toLowerCase();
    switch (normalizedLanguage) {
      case 'ru':
        return 'ru-RU';
      case 'pl':
        return 'pl-PL';
      case 'de':
        return 'de-DE';
      case 'es':
        return 'es-ES';
      case 'fr':
        return 'fr-FR';
      default:
        return `${normalizedLanguage}-${normalizedLanguage.toUpperCase()}`;
    }
  }
  return fallbackLocale || DEFAULT_REGION_PRESET.locale;
}

export function resolveUserRegionContext(input = {}) {
  const {
    authenticatedUser, // { countryCode, preferredCurrency, preferredLocale }
    telegramLanguageCode,
    acceptLanguage,
    ipCountryCode,
    geoCountryCode,
    phoneCountryCode,
  } = input;

  const acceptLanguageParts = parseAcceptLanguageHeader(acceptLanguage);

  const explicitCountry =
    authenticatedUser?.countryCode ||
    geoCountryCode ||
    ipCountryCode ||
    phoneCountryCode ||
    acceptLanguageParts?.country;

  const countryConfig = getCountryConfig(explicitCountry);
  const regionPreset = getRegionPreset(explicitCountry);

  const resolvedLocale = normalizeLocale({
    locale:
      authenticatedUser?.preferredLocale ||
      input.preferredLocale ||
      regionPreset.locale,
    language: telegramLanguageCode || acceptLanguageParts?.language,
    fallbackLocale: countryConfig.fallbackLocale,
  });

  const resolvedCurrency =
    authenticatedUser?.preferredCurrency ||
    input.preferredCurrency ||
    regionPreset.currency ||
    countryConfig.defaultCurrency ||
    DEFAULT_REGION_PRESET.currency;

  return {
    countryCode: countryConfig.countryCode || DEFAULT_REGION_PRESET.countryCode,
    currency: resolvedCurrency,
    locale: resolvedLocale,
  };
}

// Шаги внедрения:
//
// 1. Ввести CountryConfig и REGION_PRESETS.
// 2. Добавить поля countryCode, priceCurrency в модели объявления.
// 3. Реализовать resolveUserRegionContext(...) и использовать при логине/старте MiniApp.
// 4. Встроить formatPrice(...) на фронте везде, где показываются цены.
// 5. Настроить i18n:
//    - завести locale-файлы,
//    - перевести основные тексты и категории.
// 6. Привязать язык UI к Telegram language_code / выбору пользователя.
// 7. Убедиться, что выбор языка не ломает фильтрацию по геозоне и стране.
