import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeState {
  primaryColor: string;
  logoUrl?: string;
  cityName?: string;
}

interface ThemeContextValue extends ThemeState {
  setTheme: (theme: Partial<ThemeState>) => void;
  resetTheme: () => void;
}

const defaultTheme: ThemeState = {
  primaryColor: '#16a34a',
  cityName: 'Kufar Code',
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeState>(defaultTheme);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', theme.primaryColor);
  }, [theme.primaryColor]);

  const setTheme = (next: Partial<ThemeState>) => {
    setThemeState((prev) => ({ ...prev, ...next }));
  };

  const resetTheme = () => setThemeState(defaultTheme);

  const value = useMemo(
    () => ({
      ...theme,
      setTheme,
      resetTheme,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
};
