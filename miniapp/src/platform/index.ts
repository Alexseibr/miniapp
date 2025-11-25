/**
 * Platform Adapter System
 * 
 * Provides cross-platform compatibility for KETMAR Market:
 * - Telegram MiniApp
 * - Web Browser
 * - Mobile WebView (iOS/Android)
 * 
 * Usage:
 * ```tsx
 * import { usePlatform } from '@/platform';
 * 
 * function MyComponent() {
 *   const { platform, isReady, requestLocation, showAlert } = usePlatform();
 *   // ...
 * }
 * ```
 */

export * from './types';
export { default as TelegramPlatformAdapter } from './TelegramPlatformAdapter';
export { default as WebPlatformAdapter } from './WebPlatformAdapter';
export { default as MobileAppPlatformAdapter } from './MobileAppPlatformAdapter';
export { PlatformProvider, usePlatform } from './PlatformProvider';
export { detectPlatform, createPlatformAdapter } from './platformDetection';
