import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CityConfig } from '../types/city';

export interface ThemeState {
  primaryColor: string;
  logoUrl?: string;
  cityName?: string;
}

interface ThemeContextValue extends ThemeState {
  setTheme: (theme: ThemeState) => void;
  applyCityTheme: (city?: CityConfig) => void;
}

const defaultTheme: ThemeState = {
  primaryColor: '#2563eb',
};

const ThemeContext = createContext<ThemeContextValue>({
  ...defaultTheme,
  setTheme: () => undefined,
  applyCityTheme: () => undefined,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeState>(defaultTheme);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
    }
  }, [theme.primaryColor]);

  const setTheme = useMemo(
    () => (next: ThemeState) => {
      setThemeState(next);
    },
    [],
  );

  const applyCityTheme = useMemo(
    () => (city?: CityConfig) => {
      if (city?.theme?.primaryColor) {
        setThemeState((prev) => ({
          ...prev,
          primaryColor: city.theme?.primaryColor || defaultTheme.primaryColor,
          logoUrl: city.theme?.logoUrl,
          cityName: city.name,
        }));
      } else {
        setThemeState((prev) => ({ ...prev, ...defaultTheme, cityName: city?.name }));
      }
    },
    [],
  );

  return (
    <ThemeContext.Provider value={{ ...theme, setTheme, applyCityTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  return useContext(ThemeContext);
};
