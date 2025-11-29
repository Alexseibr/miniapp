/**
 * Internationalization (i18n) Service
 * Provides translation functionality for backend services
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED_LANGUAGES = ['ru', 'en', 'pl'];
const DEFAULT_LANGUAGE = 'ru';
const FALLBACK_LANGUAGE = 'en';

const translations = {};
let isInitialized = false;

/**
 * Load translations from locale files
 */
function loadTranslations() {
  if (isInitialized) return;
  
  const localesDir = path.join(__dirname, '..', 'locales');
  
  for (const lang of SUPPORTED_LANGUAGES) {
    translations[lang] = {};
    const langDir = path.join(localesDir, lang);
    
    try {
      if (fs.existsSync(langDir)) {
        const files = fs.readdirSync(langDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const namespace = file.replace('.json', '');
            const filePath = path.join(langDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            try {
              const parsed = JSON.parse(content);
              translations[lang] = { ...translations[lang], ...parsed };
            } catch (parseError) {
              console.error(`Error parsing ${filePath}:`, parseError.message);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error loading translations for ${lang}:`, error.message);
    }
  }
  
  isInitialized = true;
}

/**
 * Get translation by key
 * @param {string} key - Translation key (e.g., 'common.loading')
 * @param {string} language - Language code (ru, en, pl)
 * @param {object} params - Interpolation parameters
 * @returns {string} Translated string
 */
function t(key, language = DEFAULT_LANGUAGE, params = {}) {
  loadTranslations();
  
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  
  let text = translations[lang]?.[key];
  
  if (!text && lang !== FALLBACK_LANGUAGE) {
    text = translations[FALLBACK_LANGUAGE]?.[key];
  }
  
  if (!text) {
    return key;
  }
  
  if (params && Object.keys(params).length > 0) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
    });
  }
  
  return text;
}

/**
 * Get all translations for a language
 * @param {string} language - Language code
 * @returns {object} All translations
 */
function getAllTranslations(language = DEFAULT_LANGUAGE) {
  loadTranslations();
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  return translations[lang] || {};
}

/**
 * Get translations by namespace
 * @param {string} namespace - Namespace prefix (e.g., 'common', 'feed')
 * @param {string} language - Language code
 * @returns {object} Namespaced translations
 */
function getNamespace(namespace, language = DEFAULT_LANGUAGE) {
  loadTranslations();
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const allTrans = translations[lang] || {};
  
  const result = {};
  const prefix = `${namespace}.`;
  
  Object.entries(allTrans).forEach(([key, value]) => {
    if (key.startsWith(prefix)) {
      const shortKey = key.slice(prefix.length);
      result[shortKey] = value;
    }
  });
  
  return result;
}

/**
 * Detect language from various sources
 * @param {object} options - Detection options
 * @returns {string} Detected language code
 */
function detectLanguage(options = {}) {
  const { 
    acceptLanguage, 
    telegramLanguage, 
    userPreference,
    countryCode 
  } = options;
  
  if (userPreference && SUPPORTED_LANGUAGES.includes(userPreference)) {
    return userPreference;
  }
  
  if (telegramLanguage) {
    const tgLang = telegramLanguage.split('-')[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(tgLang)) {
      return tgLang;
    }
  }
  
  if (countryCode) {
    const countryLangMap = {
      'BY': 'ru',
      'RU': 'ru',
      'UA': 'ru',
      'KZ': 'ru',
      'PL': 'pl',
      'US': 'en',
      'GB': 'en',
      'DE': 'en',
    };
    const lang = countryLangMap[countryCode.toUpperCase()];
    if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
      return lang;
    }
  }
  
  if (acceptLanguage) {
    const langs = acceptLanguage.split(',').map(l => l.split(';')[0].trim().split('-')[0]);
    for (const lang of langs) {
      if (SUPPORTED_LANGUAGES.includes(lang)) {
        return lang;
      }
    }
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * Reload translations (for development)
 */
function reloadTranslations() {
  isInitialized = false;
  Object.keys(translations).forEach(key => delete translations[key]);
  loadTranslations();
}

/**
 * Get list of supported languages
 * @returns {array} Supported language codes
 */
function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

module.exports = {
  t,
  getAllTranslations,
  getNamespace,
  detectLanguage,
  reloadTranslations,
  getSupportedLanguages,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
};
