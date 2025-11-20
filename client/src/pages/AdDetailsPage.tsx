import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type { Ad } from "@/types/ad";

export default function AdDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, token } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    const loadAd = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/ads/${id}`);
        setAd(data?.ad || data);
      } catch (requestError) {
        console.error(requestError);
        setError("Не удалось загрузить объявление");
      } finally {
        setLoading(false);
      }
    };
    void loadAd();
  }, [id]);

  const handleStartChat = async () => {
    if (!ad || !id) return;
    if (!token || !currentUser) {
      navigate("/login");
      return;
    }
    if (ad.owner && (ad.owner._id === currentUser._id || ad.owner.id === currentUser._id)) return;

    setStartingChat(true);
    setError(null);
    try {
      const { data } = await api.post("/chat/start", { adId: id });
      const conversationId = data?._id || data?.id || data?.conversationId;
      if (conversationId) {
        navigate(`/chat/${conversationId}`);
      }
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось открыть чат с продавцом");
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) return <div className="loader">Загрузка…</div>;
  if (!ad) return <div className="error">{error || "Объявление не найдено"}</div>;

  const isOwner = ad.owner && currentUser && (ad.owner._id === currentUser._id || ad.owner.id === currentUser._id);

  return (
    <div className="page">
      <div className="ad-details">
        {ad.images?.length ? (
          <div className="gallery">
            {ad.images.map((src) => (
              <img key={src} src={src} alt={ad.title} />
            ))}
          </div>
        ) : ad.photos?.length ? (
          <div className="gallery">
            {ad.photos.map((src) => (
              <img key={src} src={src} alt={ad.title} />
            ))}
          </div>
        ) : null}

        <h1>{ad.title}</h1>
        {ad.price != null && <p className="ad-card__price">{ad.price} BYN</p>}
        {ad.description && <p>{ad.description}</p>}
        {ad.location?.address && <p className="ad-card__meta">{ad.location.address}</p>}

        {ad.owner?.phone && <p>Телефон: {ad.owner.phone}</p>}
        {ad.owner?.telegramUsername && <p>Telegram: @{ad.owner.telegramUsername}</p>}

        {!isOwner && (
          <button className="app-button" onClick={handleStartChat} disabled={startingChat}>
            {startingChat ? "Открываем чат…" : "Написать продавцу"}
          </button>
        )}
        {isOwner && <p className="muted">Это ваше объявление</p>}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
