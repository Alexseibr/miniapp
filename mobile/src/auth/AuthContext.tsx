import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '../types/user';
import { authStore } from '../utils/authStore';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  getAccessToken: () => string | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = 'kufar-mobile:user';
const TOKEN_KEY = 'kufar-mobile:token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  const login = useCallback(
    (nextToken: string, nextUser: User) => {
      setToken(nextToken);
      setUser(nextUser);
      authStore.saveSession(nextToken, nextUser);
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    authStore.logout();
  }, []);

  const getAccessToken = useCallback(() => token, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
      getAccessToken
    }),
    [getAccessToken, login, logout, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
