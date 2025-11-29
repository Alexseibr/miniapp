/**
 * Mobile App Platform Adapter
 * Implements PlatformAdapter for native mobile app WebView environment
 * 
 * This adapter communicates with native code via window.MobileAppBridge
 * Native apps (iOS/Android) should inject this bridge object before loading the WebView
 */

import type { PlatformAdapter, LocationData, PlatformUserIdentifier, MobileAppBridge } from './types';

const AUTH_TOKEN_KEY = 'ketmar_auth_token';

class MobileAppPlatformAdapter implements PlatformAdapter {
  type: 'mobile_app' = 'mobile_app';
  private _isReady = false;
  private _authToken: string | null = null;

  private get bridge(): MobileAppBridge | undefined {
    return window.MobileAppBridge;
  }

  isReady(): boolean {
    return this._isReady && !!this.bridge;
  }

  async initialize(): Promise<void> {
    try {
      if (!this.bridge) {
        console.warn('[MobileAppAdapter] MobileAppBridge not available, falling back');
      }

      const token = await this.bridge?.getAuthToken?.();
      if (token) {
        this._authToken = token;
      } else {
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (storedToken) {
          this._authToken = storedToken;
        }
      }

      this._isReady = true;
      console.log('[MobileAppAdapter] Initialized successfully');
    } catch (error) {
      console.error('[MobileAppAdapter] Initialization error:', error);
      this._isReady = true;
    }
  }

  // ========== Authentication ==========

  async getAuthToken(): Promise<string | null> {
    if (this.bridge?.getAuthToken) {
      try {
        return await this.bridge.getAuthToken();
      } catch {
        return this._authToken || localStorage.getItem(AUTH_TOKEN_KEY);
      }
    }
    return this._authToken || localStorage.getItem(AUTH_TOKEN_KEY);
  }

  setAuthToken(token: string | null): void {
    this._authToken = token;
    
    if (this.bridge?.setAuthToken) {
      this.bridge.setAuthToken(token);
    }
    
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  clearAuth(): void {
    this._authToken = null;
    
    if (this.bridge?.clearAuth) {
      this.bridge.clearAuth();
    }
    
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  async getPlatformUserId(): Promise<PlatformUserIdentifier> {
    if (this.bridge?.getAppUserId) {
      try {
        const appUserId = await this.bridge.getAppUserId();
        return { appUserId: appUserId || undefined };
      } catch {
        return {};
      }
    }
    return {};
  }

  // ========== Geolocation ==========

  async requestLocation(): Promise<LocationData> {
    if (this.bridge?.requestLocation) {
      try {
        return await this.bridge.requestLocation();
      } catch {
        return this.fallbackToNavigatorLocation();
      }
    }
    return this.fallbackToNavigatorLocation();
  }

  private fallbackToNavigatorLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  async hasLocationPermission(): Promise<boolean> {
    if (this.bridge?.hasLocationPermission) {
      try {
        return await this.bridge.hasLocationPermission();
      } catch {
        return false;
      }
    }

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state === 'granted';
      } catch {
        return false;
      }
    }

    return false;
  }

  // ========== UI Helpers ==========

  goBack(): void {
    if (this.bridge?.goBack) {
      this.bridge.goBack();
    } else if (window.history.length > 1) {
      window.history.back();
    }
  }

  showAlert(message: string, type?: 'info' | 'success' | 'error' | 'warning'): void {
    if (this.bridge?.showToast) {
      this.bridge.showToast(message, type);
    } else {
      alert(message);
    }
  }

  async showConfirm(message: string): Promise<boolean> {
    if (this.bridge?.showConfirm) {
      try {
        return await this.bridge.showConfirm(message);
      } catch {
        return window.confirm(message);
      }
    }
    return window.confirm(message);
  }

  openExternalUrl(url: string): void {
    if (this.bridge?.openUrl) {
      this.bridge.openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  }

  close(): void {
    if (this.bridge?.closeApp) {
      this.bridge.closeApp();
    }
  }

  // ========== Haptic Feedback ==========

  hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void {
    if (this.bridge?.hapticFeedback) {
      this.bridge.hapticFeedback(type);
    } else if ('vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'heavy':
          navigator.vibrate(40);
          break;
        case 'success':
          navigator.vibrate([10, 50, 10]);
          break;
        case 'warning':
          navigator.vibrate([20, 50, 20]);
          break;
        case 'error':
          navigator.vibrate([50, 50, 50]);
          break;
      }
    }
  }

  // ========== Theme ==========

  getTheme(): 'light' | 'dark' {
    if (this.bridge?.getTheme) {
      try {
        return this.bridge.getTheme();
      } catch {
        return 'light';
      }
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
  }

  onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void {
    if (this.bridge?.onThemeChange) {
      return this.bridge.onThemeChange(callback);
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => callback(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    return () => {};
  }

  // ========== App Info ==========

  getAppVersion(): string {
    if (this.bridge?.getAppVersion) {
      try {
        return this.bridge.getAppVersion();
      } catch {
        return '1.0.0';
      }
    }
    return '1.0.0';
  }

  getPlatformInfo(): Record<string, any> {
    if (this.bridge?.getPlatformInfo) {
      try {
        return this.bridge.getPlatformInfo();
      } catch {
        return { platform: 'mobile_app' };
      }
    }
    return {
      platform: 'mobile_app',
      userAgent: navigator.userAgent,
    };
  }

  // ========== Mobile-specific ==========

  registerPushToken(token: string): void {
    if (this.bridge?.registerPushToken) {
      this.bridge.registerPushToken(token);
    }
  }
}

export default MobileAppPlatformAdapter;
