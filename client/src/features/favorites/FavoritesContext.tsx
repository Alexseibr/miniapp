import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchWithAuth, getAuthToken } from "@/lib/auth";

export type FavoritesContextValue = {
  favorites: string[];
  isFavorite: (adId: string) => boolean;
  toggleFavorite: (adId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>([]);

  const isFavorite = useCallback(
    (adId: string) => favorites.includes(adId),
    [favorites],
  );

  const refreshFavorites = useCallback(async () => {
    const token = getAuthToken();

    if (!token) {
      setFavorites([]);
      return;
    }

    try {
      const response = await fetchWithAuth("/api/favorites/my");

      if (!response.ok) {
        throw new Error("Не удалось загрузить избранное");
      }

      const data = await response.json();
      const ids: string[] = Array.isArray(data)
        ? data
            .map((item: any) => item?._id ?? item?.adId ?? item?.ad?._id)
            .filter(Boolean)
        : [];

      setFavorites(ids);
    } catch (error) {
      console.error("Failed to load favorites", error);
    }
  }, []);

  useEffect(() => {
    void refreshFavorites();
  }, [refreshFavorites]);

  const toggleFavorite = useCallback(
    async (adId: string) => {
      const token = getAuthToken();

      if (!token) {
        alert("Чтобы пользоваться избранным, войдите в аккаунт");
        return;
      }

      const alreadyFavorite = favorites.includes(adId);

      try {
        const response = await fetchWithAuth(`/api/favorites/${adId}`, {
          method: alreadyFavorite ? "DELETE" : "POST",
        });

        if (!response.ok) {
          throw new Error("Не удалось обновить избранное");
        }

        setFavorites((prev) => {
          if (alreadyFavorite) {
            return prev.filter((id) => id !== adId);
          }
          return [...prev, adId];
        });
      } catch (error) {
        console.error("Favorites update failed", error);
        alert("Не удалось обновить избранное. Попробуйте снова.");
      }
    },
    [favorites],
  );

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      refreshFavorites,
    }),
    [favorites, isFavorite, toggleFavorite, refreshFavorites],
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
