/**
 * Platform Detection Utilities
 * Automatically detects the current platform and creates appropriate adapter
 */

import type { PlatformType, PlatformAdapter } from './types';
import TelegramPlatformAdapter from './TelegramPlatformAdapter';
import WebPlatformAdapter from './WebPlatformAdapter';
import MobileAppPlatformAdapter from './MobileAppPlatformAdapter';

/**
 * Detect the current platform based on available APIs
 * Priority: Telegram > MobileApp > Web
 */
export function detectPlatform(): PlatformType {
  if (typeof window === 'undefined') {
    return 'web';
  }

  if (window.Telegram?.WebApp?.initData) {
    return 'telegram';
  }

  if (window.MobileAppBridge) {
    return 'mobile_app';
  }

  return 'web';
}

/**
 * Create a platform adapter instance based on detected or specified platform
 */
export function createPlatformAdapter(platformType?: PlatformType): PlatformAdapter {
  const type = platformType || detectPlatform();

  switch (type) {
    case 'telegram':
      return new TelegramPlatformAdapter();
    case 'mobile_app':
      return new MobileAppPlatformAdapter();
    case 'web':
    default:
      return new WebPlatformAdapter();
  }
}

/**
 * Check if running in Telegram environment
 */
export function isTelegramEnvironment(): boolean {
  return detectPlatform() === 'telegram';
}

/**
 * Check if running in mobile app WebView
 */
export function isMobileAppEnvironment(): boolean {
  return detectPlatform() === 'mobile_app';
}

/**
 * Check if running in regular web browser
 */
export function isWebEnvironment(): boolean {
  return detectPlatform() === 'web';
}

/**
 * Get user-friendly platform name
 */
export function getPlatformDisplayName(type?: PlatformType): string {
  const platformType = type || detectPlatform();
  
  switch (platformType) {
    case 'telegram':
      return 'Telegram';
    case 'mobile_app':
      return 'Мобильное приложение';
    case 'web':
      return 'Веб-браузер';
    default:
      return 'Неизвестно';
  }
}
