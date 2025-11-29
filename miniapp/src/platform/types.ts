/**
 * Platform Adapter Types
 * Defines interfaces for cross-platform compatibility (Telegram / Web / Mobile WebView)
 */

export type PlatformType = 'telegram' | 'mobile_app' | 'web';

export type AuthProvider = 'telegram' | 'sms' | 'email' | 'google' | 'app';

export interface PlatformUserIdentifier {
  telegramId?: number;
  appUserId?: string;
  phone?: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface AuthTokenPayload {
  token: string;
  expiresAt?: number;
}

export interface PlatformAdapter {
  /** Platform type identifier */
  type: PlatformType;

  /** Check if platform is ready/initialized */
  isReady(): boolean;

  /** Initialize the platform (called once on app start) */
  initialize(): Promise<void>;

  // ========== Authentication ==========
  
  /** Get current JWT auth token */
  getAuthToken(): Promise<string | null>;
  
  /** Store JWT auth token */
  setAuthToken(token: string | null): void;
  
  /** Clear auth data (logout) */
  clearAuth(): void;

  /** Get platform-specific user identifier */
  getPlatformUserId(): Promise<PlatformUserIdentifier>;

  /** Get Telegram initData (only for Telegram platform) */
  getTelegramInitData?(): string | null;

  // ========== Geolocation ==========
  
  /** Request user's location */
  requestLocation(): Promise<LocationData>;
  
  /** Check if location permission is granted */
  hasLocationPermission(): Promise<boolean>;

  // ========== UI Helpers ==========
  
  /** Navigate back */
  goBack(): void;
  
  /** Show alert/toast message */
  showAlert(message: string, type?: 'info' | 'success' | 'error' | 'warning'): void;
  
  /** Show confirmation dialog */
  showConfirm(message: string): Promise<boolean>;
  
  /** Open external URL */
  openExternalUrl(url: string): void;
  
  /** Close the app (if applicable) */
  close?(): void;

  // ========== Haptic Feedback ==========
  
  /** Trigger haptic feedback */
  hapticFeedback?(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void;

  // ========== Theme ==========
  
  /** Get current theme */
  getTheme(): 'light' | 'dark';
  
  /** Subscribe to theme changes */
  onThemeChange?(callback: (theme: 'light' | 'dark') => void): () => void;

  // ========== App Info ==========
  
  /** Get app version */
  getAppVersion(): string;
  
  /** Get platform-specific info */
  getPlatformInfo(): Record<string, any>;
}

/** Mobile App Bridge interface (injected by native app) */
export interface MobileAppBridge {
  getAuthToken(): Promise<string | null>;
  setAuthToken(token: string | null): void;
  clearAuth(): void;
  getAppUserId(): Promise<string | null>;
  requestLocation(): Promise<LocationData>;
  hasLocationPermission(): Promise<boolean>;
  goBack(): void;
  showToast(message: string, type?: string): void;
  showConfirm(message: string): Promise<boolean>;
  openUrl(url: string): void;
  closeApp(): void;
  hapticFeedback(type: string): void;
  getTheme(): 'light' | 'dark';
  onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void;
  getAppVersion(): string;
  getPlatformInfo(): Record<string, any>;
  registerPushToken?(token: string): void;
}

declare global {
  interface Window {
    MobileAppBridge?: MobileAppBridge;
  }
}
