import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FavoritesContextValue = {
  favorites: string[];
  isFavorite: (adId: string) => boolean;
  toggleFavorite: (adId: string) => void;
  setFavorites: (ids: string[]) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

const STORAGE_KEY = "ketmar:favorites";

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavoritesState] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore write errors
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (adId: string) => favorites.includes(adId),
    [favorites],
  );

  const toggleFavorite = useCallback((adId: string) => {
    setFavoritesState((prev) => {
      const exists = prev.includes(adId);
      const next = exists ? prev.filter((id) => id !== adId) : [...prev, adId];

      // TODO: отправлять POST /api/favorites или DELETE /api/favorites/:adId когда backend добавим.

      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      setFavorites: setFavoritesState,
      // TODO: syncFavoritesWithBackend()
    }),
    [favorites, isFavorite, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }

  return context;
}
