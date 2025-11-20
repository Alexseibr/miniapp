import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { api, getStoredToken, setAuthToken } from "@/api/client";

export interface AuthContextValue {
  token: string | null;
  currentUser: any;
  loadingUser: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  const applyToken = useCallback((value: string | null) => {
    setToken(value);
    setAuthToken(value);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setCurrentUser(null);
      setLoadingUser(false);
      return;
    }

    setLoadingUser(true);
    try {
      const { data } = await api.get("/users/me");
      setCurrentUser(data);
    } catch (error) {
      console.error("Failed to load user", error);
      applyToken(null);
      setCurrentUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, [applyToken, token]);

  useEffect(() => {
    const storedToken = getStoredToken();
    if (storedToken) {
      applyToken(storedToken);
    } else {
      setLoadingUser(false);
    }
  }, [applyToken]);

  useEffect(() => {
    if (token) {
      void refreshUser();
    }
  }, [refreshUser, token]);

  const login = useCallback(
    (jwt: string, user: any) => {
      applyToken(jwt);
      setCurrentUser(user);
    },
    [applyToken],
  );

  const logout = useCallback(() => {
    applyToken(null);
    setCurrentUser(null);
  }, [applyToken]);

  const value = useMemo(
    () => ({ token, currentUser, loadingUser, login, logout, refreshUser }),
    [currentUser, loadingUser, login, logout, refreshUser, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
