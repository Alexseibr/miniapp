import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth";

export type FavoritesContextValue = {
  favorites: string[];
  favoriteIds: string[];
  isFavorite: (adId: string) => boolean;
  toggleFavorite: (adId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const isFavorite = useCallback(
    (adId: string) => favoriteIds.includes(adId),
    [favoriteIds],
  );

  const refreshFavorites = useCallback(async () => {
    if (!token) {
      setFavoriteIds([]);
      return;
    }

    try {
      const response = await fetchWithAuth("/api/favorites/ids");

      if (!response.ok) {
        throw new Error("Не удалось загрузить избранное");
      }

      const data = await response.json();
      const ids: string[] = Array.isArray(data?.adIds) ? data.adIds.filter(Boolean) : [];

      setFavoriteIds(ids);
    } catch (error) {
      console.error("Failed to load favorites", error);
      setFavoriteIds([]);
    }
  }, [token]);

  useEffect(() => {
    void refreshFavorites();
  }, [refreshFavorites]);

  const toggleFavorite = useCallback(
    async (adId: string) => {
      if (!token) {
        throw new Error("Unauthorized");
      }

      const alreadyFavorite = favoriteIds.includes(adId);
      setFavoriteIds((prev) =>
        alreadyFavorite ? prev.filter((id) => id !== adId) : [...prev, adId],
      );

      try {
        const response = await fetchWithAuth(`/api/favorites/${adId}`, {
          method: alreadyFavorite ? "DELETE" : "POST",
        });

        if (!response.ok) {
          throw new Error("Не удалось обновить избранное");
        }
      } catch (error) {
        console.error("Favorites update failed", error);
        setFavoriteIds((prev) =>
          alreadyFavorite ? [...prev, adId] : prev.filter((id) => id !== adId),
        );
        throw error;
      }
    },
    [favoriteIds, token],
  );

  const value = useMemo(
    () => ({
      favorites: favoriteIds,
      favoriteIds,
      isFavorite,
      toggleFavorite,
      refreshFavorites,
    }),
    [favoriteIds, isFavorite, toggleFavorite, refreshFavorites],
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
