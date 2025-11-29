import { useCallback, useMemo } from 'react';
import useRegionStore from '@/store/useRegionStore';
import { t as translate, setLanguage, getSupportedLanguages, type LanguageCode } from '@/lib/i18n';

/**
 * Hook for translations with current language from region store
 */
export function useTranslation() {
  const { language, setLanguage: setStoreLang } = useRegionStore();

  useMemo(() => {
    setLanguage(language);
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(key, params);
    },
    [language]
  );

  const changeLanguage = useCallback(
    (newLang: LanguageCode) => {
      setStoreLang(newLang);
      setLanguage(newLang);
    },
    [setStoreLang]
  );

  const languages = useMemo(() => getSupportedLanguages(), []);

  return {
    t,
    language,
    changeLanguage,
    languages,
  };
}

export default useTranslation;
