/**
 * Platform Provider
 * React context provider for platform adapter
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { PlatformAdapter, PlatformType, LocationData, PlatformUserIdentifier } from './types';
import { createPlatformAdapter, detectPlatform } from './platformDetection';

interface PlatformContextValue {
  platform: PlatformAdapter;
  platformType: PlatformType;
  isReady: boolean;
  isInitializing: boolean;
  error: Error | null;

  getAuthToken: () => Promise<string | null>;
  setAuthToken: (token: string | null) => void;
  clearAuth: () => void;
  getPlatformUserId: () => Promise<PlatformUserIdentifier>;
  getTelegramInitData: () => string | null;

  requestLocation: () => Promise<LocationData>;
  hasLocationPermission: () => Promise<boolean>;

  goBack: () => void;
  showAlert: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  showConfirm: (message: string) => Promise<boolean>;
  openExternalUrl: (url: string) => void;
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;

  getTheme: () => 'light' | 'dark';
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

interface PlatformProviderProps {
  children: ReactNode;
  forcePlatform?: PlatformType;
}

export function PlatformProvider({ children, forcePlatform }: PlatformProviderProps) {
  const [platform] = useState(() => createPlatformAdapter(forcePlatform));
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initPlatform = async () => {
      try {
        await platform.initialize();
        if (mounted) {
          setIsReady(platform.isReady());
          setIsInitializing(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Platform initialization failed'));
          setIsInitializing(false);
        }
      }
    };

    initPlatform();

    return () => {
      mounted = false;
    };
  }, [platform]);

  const getAuthToken = useCallback(() => {
    return platform.getAuthToken();
  }, [platform]);

  const setAuthToken = useCallback((token: string | null) => {
    platform.setAuthToken(token);
  }, [platform]);

  const clearAuth = useCallback(() => {
    platform.clearAuth();
  }, [platform]);

  const getPlatformUserId = useCallback(() => {
    return platform.getPlatformUserId();
  }, [platform]);

  const getTelegramInitData = useCallback(() => {
    if ('getTelegramInitData' in platform && typeof platform.getTelegramInitData === 'function') {
      return platform.getTelegramInitData();
    }
    return null;
  }, [platform]);

  const requestLocation = useCallback(() => {
    return platform.requestLocation();
  }, [platform]);

  const hasLocationPermission = useCallback(() => {
    return platform.hasLocationPermission();
  }, [platform]);

  const goBack = useCallback(() => {
    platform.goBack();
  }, [platform]);

  const showAlert = useCallback((message: string, type?: 'info' | 'success' | 'error' | 'warning') => {
    platform.showAlert(message, type);
  }, [platform]);

  const showConfirm = useCallback((message: string) => {
    return platform.showConfirm(message);
  }, [platform]);

  const openExternalUrl = useCallback((url: string) => {
    platform.openExternalUrl(url);
  }, [platform]);

  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    platform.hapticFeedback?.(type);
  }, [platform]);

  const getTheme = useCallback(() => {
    return platform.getTheme();
  }, [platform]);

  const value: PlatformContextValue = {
    platform,
    platformType: platform.type,
    isReady,
    isInitializing,
    error,
    getAuthToken,
    setAuthToken,
    clearAuth,
    getPlatformUserId,
    getTelegramInitData,
    requestLocation,
    hasLocationPermission,
    goBack,
    showAlert,
    showConfirm,
    openExternalUrl,
    hapticFeedback,
    getTheme,
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Hook to access platform functionality
 */
export function usePlatform(): PlatformContextValue {
  const context = useContext(PlatformContext);
  
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  
  return context;
}

/**
 * Hook to get current platform type
 */
export function usePlatformType(): PlatformType {
  const { platformType } = usePlatform();
  return platformType;
}

/**
 * Hook to check if platform is Telegram
 */
export function useIsTelegram(): boolean {
  const { platformType } = usePlatform();
  return platformType === 'telegram';
}

/**
 * Hook to check if platform is ready
 */
export function usePlatformReady(): { isReady: boolean; isInitializing: boolean; error: Error | null } {
  const { isReady, isInitializing, error } = usePlatform();
  return { isReady, isInitializing, error };
}
