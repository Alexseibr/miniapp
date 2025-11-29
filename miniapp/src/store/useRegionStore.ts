import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CurrencyCode = 'BYN' | 'RUB' | 'UAH' | 'KZT' | 'PLN' | 'EUR' | 'USD';
export type CountryCode = 'BY' | 'RU' | 'UA' | 'KZ' | 'PL' | 'DE' | 'US';
export type LanguageCode = 'ru' | 'en' | 'pl';

interface CountryConfig {
  countryCode: CountryCode;
  countryName: string;
  defaultCurrency: CurrencyCode;
  currencySymbol: string;
  supportedCurrencies: CurrencyCode[];
  defaultLocale: string;
  fallbackLocale: string;
  phonePrefix: string;
}

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
}

const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
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

const CURRENCY_INFO: Record<CurrencyCode, CurrencyInfo> = {
  BYN: { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль', decimals: 2 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Российский рубль', decimals: 0 },
  UAH: { code: 'UAH', symbol: '₴', name: 'Украинская гривна', decimals: 2 },
  KZT: { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге', decimals: 0 },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
};

interface RegionState {
  countryCode: CountryCode;
  currency: CurrencyCode;
  language: LanguageCode;
  locale: string;
  isInitialized: boolean;
  
  setCountry: (countryCode: CountryCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setLanguage: (language: LanguageCode) => void;
  initializeFromTelegram: () => void;
  getCountryConfig: () => CountryConfig;
  getCurrencyInfo: (code?: CurrencyCode) => CurrencyInfo;
  getSupportedCurrencies: () => CurrencyInfo[];
  formatPrice: (value: number | null | undefined, options?: FormatPriceOptions) => string;
}

interface FormatPriceOptions {
  currency?: CurrencyCode;
  showDecimals?: boolean;
  showFree?: boolean;
  freeText?: string;
  emptyText?: string;
  compact?: boolean;
}

function detectLanguageFromTelegram(): LanguageCode {
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgLang) {
    const lang = tgLang.split('-')[0].toLowerCase();
    if (['ru', 'en', 'pl'].includes(lang)) {
      return lang as LanguageCode;
    }
  }
  return 'ru';
}

function detectCountryFromTelegram(): CountryCode {
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgLang) {
    const countryMap: Record<string, CountryCode> = {
      'ru': 'RU',
      'be': 'BY',
      'uk': 'UA',
      'kk': 'KZ',
      'pl': 'PL',
      'de': 'DE',
      'en': 'US',
    };
    const lang = tgLang.split('-')[0].toLowerCase();
    return countryMap[lang] || 'BY';
  }
  return 'BY';
}

const useRegionStore = create<RegionState>()(
  persist(
    (set, get) => ({
      countryCode: 'BY',
      currency: 'BYN',
      language: 'ru',
      locale: 'ru-BY',
      isInitialized: false,

      setCountry(countryCode: CountryCode) {
        const config = COUNTRY_CONFIGS[countryCode];
        set({
          countryCode,
          currency: config.defaultCurrency,
          locale: config.defaultLocale,
        });
      },

      setCurrency(currency: CurrencyCode) {
        set({ currency });
      },

      setLanguage(language: LanguageCode) {
        set({ language });
      },

      initializeFromTelegram() {
        if (get().isInitialized) return;
        
        const detectedLang = detectLanguageFromTelegram();
        const detectedCountry = detectCountryFromTelegram();
        const config = COUNTRY_CONFIGS[detectedCountry];
        
        set({
          countryCode: detectedCountry,
          currency: config.defaultCurrency,
          language: detectedLang,
          locale: config.defaultLocale,
          isInitialized: true,
        });
      },

      getCountryConfig() {
        return COUNTRY_CONFIGS[get().countryCode];
      },

      getCurrencyInfo(code?: CurrencyCode) {
        const currencyCode = code || get().currency;
        return CURRENCY_INFO[currencyCode] || CURRENCY_INFO.USD;
      },

      getSupportedCurrencies() {
        const config = get().getCountryConfig();
        return config.supportedCurrencies.map(code => CURRENCY_INFO[code]);
      },

      formatPrice(value: number | null | undefined, options: FormatPriceOptions = {}) {
        const { currency: optCurrency, showDecimals, showFree, freeText, emptyText, compact } = options;
        const currencyCode = optCurrency || get().currency;
        const locale = get().locale;
        const currencyInfo = CURRENCY_INFO[currencyCode];

        if (value === null || value === undefined) {
          return emptyText || '—';
        }

        if (value === 0 && showFree) {
          return freeText || 'Бесплатно';
        }

        if (compact) {
          if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M ${currencyInfo.symbol}`;
          }
          if (value >= 10000) {
            return `${Math.round(value / 1000)}K ${currencyInfo.symbol}`;
          }
        }

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
      },
    }),
    {
      name: 'ketmar-region-store',
      partialize: (state) => ({
        countryCode: state.countryCode,
        currency: state.currency,
        language: state.language,
        locale: state.locale,
        isInitialized: state.isInitialized,
      }),
    }
  )
);

export default useRegionStore;

export { COUNTRY_CONFIGS, CURRENCY_INFO };
export type { CountryConfig, CurrencyInfo, FormatPriceOptions };
