import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import type { CurrentUser } from "@/types/user";

interface AuthContextValue {
  token: string | null;
  currentUser: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  setToken: (token: string | null) => void;
  refreshCurrentUser: (authToken?: string | null) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchCurrentUser(authToken: string): Promise<CurrentUser> {
  const response = await fetch("/api/users/me", {
    headers: { Authorization: `Bearer ${authToken}` },
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Не удалось загрузить профиль");
  }

  return response.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistToken = useCallback((value: string | null) => {
    setTokenState(value);
    if (typeof localStorage === "undefined") return;
    if (value) {
      localStorage.setItem(AUTH_TOKEN_KEY, value);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }, []);

  const loadCurrentUser = useCallback(
    async (authToken = token) => {
      if (!authToken) return;
      setIsLoading(true);
      setError(null);

      try {
        const user = await fetchCurrentUser(authToken);
        setCurrentUser(user);
      } catch (requestError) {
        setError((requestError as Error).message);
        setCurrentUser(null);
        persistToken(null);
      } finally {
        setIsLoading(false);
      }
    },
    [persistToken, token]
  );

  useEffect(() => {
    const storedToken = typeof localStorage !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
    if (storedToken) {
      setTokenState(storedToken);
      void loadCurrentUser(storedToken);
    }
  }, [loadCurrentUser]);

  const logout = useCallback(() => {
    persistToken(null);
    setCurrentUser(null);
    setError(null);
  }, [persistToken]);

  const value = useMemo(
    () => ({
      token,
      currentUser,
      isLoading,
      error,
      setCurrentUser,
      setToken: persistToken,
      refreshCurrentUser: loadCurrentUser,
      logout,
    }),
    [currentUser, error, isLoading, token, loadCurrentUser, logout, persistToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth должен использоваться внутри AuthProvider");
  }
  return context;
}
