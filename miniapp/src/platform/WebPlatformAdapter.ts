/**
 * Web Platform Adapter
 * Implements PlatformAdapter for standard web browser environment
 */

import type { PlatformAdapter, LocationData, PlatformUserIdentifier } from './types';

const AUTH_TOKEN_KEY = 'ketmar_auth_token';
const THEME_KEY = 'ketmar_theme';

class WebPlatformAdapter implements PlatformAdapter {
  type: 'web' = 'web';
  private _isReady = false;
  private _authToken: string | null = null;
  private _themeListeners: Set<(theme: 'light' | 'dark') => void> = new Set();

  isReady(): boolean {
    return this._isReady;
  }

  async initialize(): Promise<void> {
    try {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (storedToken) {
        this._authToken = storedToken;
      }

      this.setupThemeMediaQuery();

      this._isReady = true;
      console.log('[WebAdapter] Initialized successfully');
    } catch (error) {
      console.error('[WebAdapter] Initialization error:', error);
    }
  }

  private setupThemeMediaQuery(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        const theme = e.matches ? 'dark' : 'light';
        this._themeListeners.forEach((callback) => callback(theme));
      });
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
    return {};
  }

  // ========== Geolocation ==========

  async requestLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
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
          let errorMessage = 'Location request failed';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'User denied the request for Geolocation';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'The request to get user location timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    });
  }

  async hasLocationPermission(): Promise<boolean> {
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
      window.location.href = '/';
    }
  }

  showAlert(message: string, type?: 'info' | 'success' | 'error' | 'warning'): void {
    const event = new CustomEvent('ketmar:toast', {
      detail: { message, type: type || 'info' },
    });
    window.dispatchEvent(event);
    
    if (!document.querySelector('[data-toast-container]')) {
      alert(message);
    }
  }

  async showConfirm(message: string): Promise<boolean> {
    return window.confirm(message);
  }

  openExternalUrl(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  close(): void {
    window.close();
  }

  // ========== Haptic Feedback ==========

  hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void {
    if ('vibrate' in navigator) {
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
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
  }

  onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void {
    this._themeListeners.add(callback);
    return () => {
      this._themeListeners.delete(callback);
    };
  }

  // ========== App Info ==========

  getAppVersion(): string {
    return '1.0.0';
  }

  getPlatformInfo(): Record<string, any> {
    return {
      platform: 'web',
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      colorScheme: this.getTheme(),
    };
  }
}

export default WebPlatformAdapter;
