import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Globe, Check, X } from 'lucide-react';
import useRegionStore, { 
  COUNTRY_CONFIGS, 
  CURRENCY_INFO, 
  type CountryCode, 
  type CurrencyCode,
  type LanguageCode,
} from '@/store/useRegionStore';
import { useTranslation } from '@/hooks/useTranslation';

interface RegionSelectorProps {
  variant?: 'full' | 'compact' | 'currency-only';
  showLabel?: boolean;
}

const LANGUAGES: Array<{ code: LanguageCode; name: string; abbr: string }> = [
  { code: 'ru', name: 'Русский', abbr: 'RU' },
  { code: 'en', name: 'English', abbr: 'EN' },
  { code: 'pl', name: 'Polski', abbr: 'PL' },
];

export default function RegionSelector({ variant = 'compact', showLabel = true }: RegionSelectorProps) {
  const { t, changeLanguage } = useTranslation();
  const { 
    countryCode, 
    currency,
    language,
    setCountry, 
    setCurrency, 
    getSupportedCurrencies,
    getCountryConfig,
  } = useRegionStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'country' | 'currency' | 'language'>('country');
  const modalRef = useRef<HTMLDivElement>(null);

  const countryConfig = getCountryConfig();
  const supportedCurrencies = getSupportedCurrencies();
  const currentCurrencyInfo = CURRENCY_INFO[currency];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleCountrySelect = (code: CountryCode) => {
    setCountry(code);
    setIsOpen(false);
  };

  const handleCurrencySelect = (code: CurrencyCode) => {
    setCurrency(code);
    setIsOpen(false);
  };

  const handleLanguageSelect = (code: LanguageCode) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'currency-only') {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          data-testid="button-currency-selector"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            background: '#F3F4F6',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: '#374151',
          }}
        >
          <span style={{ fontSize: 16 }}>{currentCurrencyInfo.symbol}</span>
          <span>{currency}</span>
          <ChevronDown size={14} style={{ opacity: 0.6 }} />
        </button>

        {isOpen && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 40,
              }}
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={modalRef}
              role="listbox"
              tabIndex={-1}
              aria-label={t('region.currency')}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: '#FFFFFF',
                borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                zIndex: 50,
                minWidth: 160,
                overflow: 'hidden',
              }}
            >
              {supportedCurrencies.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => handleCurrencySelect(curr.code)}
                  role="option"
                  aria-selected={currency === curr.code}
                  data-testid={`currency-option-${curr.code}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: currency === curr.code ? '#F3F4F6' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 14,
                    color: '#374151',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{curr.symbol}</span>
                    <span>{curr.code}</span>
                  </span>
                  {currency === curr.code && <Check size={16} color="#10B981" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-region-selector"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: variant === 'compact' ? '8px 12px' : '10px 16px',
          background: '#F3F4F6',
          borderRadius: 10,
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
          color: '#374151',
        }}
      >
        <Globe size={18} />
        {showLabel && (
          <span>
            {variant === 'compact' 
              ? `${countryCode} / ${currency}`
              : `${countryConfig.countryName} (${currentCurrencyInfo.symbol})`
            }
          </span>
        )}
        <ChevronDown size={14} style={{ opacity: 0.6 }} />
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 40,
            }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('region.select')}
            tabIndex={-1}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#FFFFFF',
              borderRadius: '16px 16px 0 0',
              boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.2)',
              zIndex: 50,
              maxHeight: '70vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #E5E7EB',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1F2937' }}>
                {t('region.select')}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                data-testid="button-close-region"
                aria-label={t('common.close')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  background: '#F3F4F6',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="#6B7280" />
              </button>
            </div>

            <div
              role="tablist"
              style={{
                display: 'flex',
                borderBottom: '1px solid #E5E7EB',
              }}
            >
              {(['country', 'currency', 'language'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  aria-selected={activeTab === tab}
                  data-testid={`tab-${tab}`}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? '#1F2937' : '#6B7280',
                    borderBottom: activeTab === tab ? '2px solid #3B82F6' : '2px solid transparent',
                  }}
                >
                  {tab === 'country' && t('region.select')}
                  {tab === 'currency' && t('region.currency')}
                  {tab === 'language' && t('region.language')}
                </button>
              ))}
            </div>

            <div 
              role="tabpanel"
              style={{ flex: 1, overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {activeTab === 'country' && (
                <>
                  {(Object.keys(COUNTRY_CONFIGS) as CountryCode[]).map((code) => {
                    const config = COUNTRY_CONFIGS[code];
                    return (
                      <button
                        key={code}
                        onClick={() => handleCountrySelect(code)}
                        data-testid={`country-option-${code}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '14px 20px',
                          border: 'none',
                          background: countryCode === code ? '#EFF6FF' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 15,
                          color: '#374151',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ 
                            width: 36, 
                            height: 36, 
                            background: countryCode === code ? '#3B82F6' : '#F3F4F6',
                            color: countryCode === code ? '#FFFFFF' : '#6B7280',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 600,
                          }}>{code}</span>
                          <span style={{ fontWeight: countryCode === code ? 600 : 400 }}>
                            {config.countryName}
                          </span>
                        </span>
                        {countryCode === code && <Check size={20} color="#3B82F6" />}
                      </button>
                    );
                  })}
                </>
              )}

              {activeTab === 'currency' && (
                <>
                  {supportedCurrencies.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => handleCurrencySelect(curr.code)}
                      data-testid={`currency-option-${curr.code}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '14px 20px',
                        border: 'none',
                        background: currency === curr.code ? '#EFF6FF' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 15,
                        color: '#374151',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ 
                          width: 36, 
                          height: 36, 
                          background: '#F3F4F6', 
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 600,
                        }}>
                          {curr.symbol}
                        </span>
                        <span>
                          <span style={{ 
                            fontWeight: currency === curr.code ? 600 : 400,
                            display: 'block',
                          }}>
                            {curr.code}
                          </span>
                          <span style={{ color: '#9CA3AF', fontSize: 13 }}>
                            {curr.name}
                          </span>
                        </span>
                      </span>
                      {currency === curr.code && <Check size={20} color="#3B82F6" />}
                    </button>
                  ))}
                </>
              )}

              {activeTab === 'language' && (
                <>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSelect(lang.code)}
                      data-testid={`language-option-${lang.code}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '14px 20px',
                        border: 'none',
                        background: language === lang.code ? '#EFF6FF' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 15,
                        color: '#374151',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ 
                          width: 36, 
                          height: 36, 
                          background: language === lang.code ? '#3B82F6' : '#F3F4F6',
                          color: language === lang.code ? '#FFFFFF' : '#6B7280',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 600,
                        }}>{lang.abbr}</span>
                        <span style={{ fontWeight: language === lang.code ? 600 : 400 }}>
                          {lang.name}
                        </span>
                      </span>
                      {language === lang.code && <Check size={20} color="#3B82F6" />}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
