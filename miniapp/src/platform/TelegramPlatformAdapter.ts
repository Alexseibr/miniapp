/**
 * Telegram Platform Adapter
 * Implements PlatformAdapter for Telegram MiniApp environment
 */

import type { PlatformAdapter, LocationData, PlatformUserIdentifier } from './types';

const AUTH_TOKEN_KEY = 'ketmar_auth_token';

class TelegramPlatformAdapter implements PlatformAdapter {
  type: 'telegram' = 'telegram';
  private _isReady = false;
  private _authToken: string | null = null;

  private get webApp() {
    return window.Telegram?.WebApp;
  }

  isReady(): boolean {
    return this._isReady && !!this.webApp;
  }

  async initialize(): Promise<void> {
    if (!this.webApp) {
      console.warn('[TelegramAdapter] Telegram WebApp not available');
      return;
    }

    try {
      this.webApp.ready();
      this.webApp.expand?.();
      
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (storedToken) {
        this._authToken = storedToken;
      }

      this._isReady = true;
      console.log('[TelegramAdapter] Initialized successfully');
    } catch (error) {
      console.error('[TelegramAdapter] Initialization error:', error);
    }
  }

  // ========== Authentication ==========

  async getAuthToken(): Promise<string | null> {
    return this._authToken || localStorage.getItem(AUTH_TOKEN_KEY);
  }

  setAuthToken(token: string | null): void {
    this._authToken = token;
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  clearAuth(): void {
    this._authToken = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  async getPlatformUserId(): Promise<PlatformUserIdentifier> {
    const user = this.webApp?.initDataUnsafe?.user;
    return {
      telegramId: user?.id,
    };
  }

  getTelegramInitData(): string | null {
    return this.webApp?.initData || null;
  }

  // ========== Geolocation ==========

  async requestLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      const locationManager = (this.webApp as any)?.LocationManager;
      
      if (locationManager?.isLocationAvailable) {
        locationManager.getLocation((location: any) => {
          if (location) {
            resolve({
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.horizontal_accuracy,
            });
          } else {
            this.fallbackToNavigatorLocation().then(resolve).catch(reject);
          }
        });
      } else {
        this.fallbackToNavigatorLocation().then(resolve).catch(reject);
      }
    });
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
    const locationManager = (this.webApp as any)?.LocationManager;
    if (locationManager) {
      return locationManager.isLocationAvailable === true;
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
    if (window.history.length > 1) {
      window.history.back();
    } else {
      (this.webApp as any)?.close?.();
    }
  }

  showAlert(message: string, type?: 'info' | 'success' | 'error' | 'warning'): void {
    const wa = this.webApp as any;
    if (wa?.showAlert) {
      wa.showAlert(message);
    } else {
      alert(message);
    }
  }

  async showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const wa = this.webApp as any;
      if (wa?.showConfirm) {
        wa.showConfirm(message, (confirmed: boolean) => {
          resolve(confirmed);
        });
      } else {
        resolve(window.confirm(message));
      }
    });
  }

  openExternalUrl(url: string): void {
    if (url.startsWith('https://t.me/') && this.webApp?.openTelegramLink) {
      this.webApp.openTelegramLink(url);
    } else if (this.webApp?.openLink) {
      this.webApp.openLink(url, { try_instant_view: true });
    } else {
      window.open(url, '_blank');
    }
  }

  close(): void {
    (this.webApp as any)?.close?.();
  }

  // ========== Haptic Feedback ==========

  hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void {
    const haptic = (this.webApp as any)?.HapticFeedback;
    if (!haptic) return;

    switch (type) {
      case 'light':
        haptic.impactOccurred?.('light');
        break;
      case 'medium':
        haptic.impactOccurred?.('medium');
        break;
      case 'heavy':
        haptic.impactOccurred?.('heavy');
        break;
      case 'success':
        haptic.notificationOccurred?.('success');
        break;
      case 'warning':
        haptic.notificationOccurred?.('warning');
        break;
      case 'error':
        haptic.notificationOccurred?.('error');
        break;
    }
  }

  // ========== Theme ==========

  getTheme(): 'light' | 'dark' {
    return (this.webApp as any)?.colorScheme || 'light';
  }

  onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void {
    const handler = () => {
      callback(this.getTheme());
    };

    (this.webApp as any)?.onEvent?.('themeChanged', handler);
    
    return () => {
      (this.webApp as any)?.offEvent?.('themeChanged', handler);
    };
  }

  // ========== App Info ==========

  getAppVersion(): string {
    return (this.webApp as any)?.version || '1.0.0';
  }

  getPlatformInfo(): Record<string, any> {
    return {
      platform: (this.webApp as any)?.platform || 'unknown',
      version: this.getAppVersion(),
      colorScheme: this.getTheme(),
      isExpanded: (this.webApp as any)?.isExpanded,
      viewportHeight: (this.webApp as any)?.viewportHeight,
      headerColor: (this.webApp as any)?.headerColor,
      backgroundColor: (this.webApp as any)?.backgroundColor,
    };
  }
}

export default TelegramPlatformAdapter;
