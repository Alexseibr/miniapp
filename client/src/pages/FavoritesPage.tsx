import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import AdCard from "@/components/AdCard";
import { useAuth } from "@/context/AuthContext";
import type { Ad } from "@/types/ad";

export default function FavoritesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const { data } = await api.get("/favorites/my");
        const list: Ad[] = Array.isArray(data)
          ? data.map((item: any) => item?.ad ?? item).filter(Boolean)
          : [];
        setAds(list);
      } catch (requestError) {
        console.error(requestError);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const toggleFavorite = async (adId: string) => {
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      await api.delete(`/favorites/${adId}`);
      setAds((prev) => prev.filter((ad) => ad._id !== adId));
    } catch (requestError) {
      console.error(requestError);
    }
  };

  if (!token) {
    return (
      <div className="page">
        <p>Войдите для просмотра избранного.</p>
        <Link to="/login">Перейти к авторизации</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Избранное</h1>
      {loading && <div className="loader">Загрузка…</div>}
      <div className="ads-grid">
        {ads.map((ad) => (
          <AdCard key={ad._id} ad={ad} isFavorite onToggleFavorite={toggleFavorite} />
        ))}
      </div>
      {!loading && !ads.length && <p className="muted">Список избранного пуст</p>}
    </div>
  );
}
