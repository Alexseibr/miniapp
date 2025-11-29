import { useCallback } from 'react';
import useRegionStore from '@/store/useRegionStore';
import type { CurrencyCode, LanguageCode } from '@/store/useRegionStore';
import { useTranslation } from '@/hooks/useTranslation';

interface FormatPriceOptions {
  currency?: CurrencyCode;
  showDecimals?: boolean;
  showFree?: boolean;
  freeText?: string;
  emptyText?: string;
  compact?: boolean;
}

/**
 * Hook for formatting prices with current region settings and i18n
 */
export function useFormatPrice() {
  const store = useRegionStore();
  const { t } = useTranslation();
  
  const { currency, locale, language } = store;

  const format = useCallback(
    (value: number | null | undefined, options: FormatPriceOptions = {}) => {
      const freeText = options.freeText || t('common.free');
      const emptyText = options.emptyText || '—';
      
      return store.formatPrice(value, {
        currency: options.currency,
        showDecimals: options.showDecimals,
        showFree: options.showFree,
        freeText,
        emptyText,
        compact: options.compact,
      });
    },
    [currency, locale, language, store, t]
  );

  const formatCompact = useCallback(
    (value: number | null | undefined, options: FormatPriceOptions = {}) => {
      return format(value, { ...options, compact: true });
    },
    [format]
  );

  const formatCard = useCallback(
    (value: number | null | undefined, isFree: boolean = false) => {
      if (isFree || value === 0) {
        return t('common.free');
      }
      return format(value, { compact: true });
    },
    [format, t]
  );

  return {
    format,
    formatCompact,
    formatCard,
    currency,
    locale,
    language,
  };
}

export default useFormatPrice;

export type { CurrencyCode, LanguageCode };
