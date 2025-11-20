import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Ad } from "@/types/ad";
import { fetchWithAuth } from "@/lib/auth";
import Loader from "@/components/Loader";
import ErrorMessage from "@/components/ErrorMessage";
import AdGallery from "@/components/AdGallery";
import { useAuth } from "@/features/auth/AuthContext";

export default function AdDetails() {
  const navigate = useNavigate();
  const { id: adId } = useParams();
  const { currentUser } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const loadAd = async () => {
      if (!adId) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(`/api/ads/${adId}`);
        if (!response.ok) {
          throw new Error("Не удалось загрузить объявление");
        }
        const data = await response.json();
        setAd(data?.ad ?? data);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Ошибка загрузки объявления");
      } finally {
        setIsLoading(false);
      }
    };

    void loadAd();
  }, [adId]);

  const startChat = async () => {
    if (!adId) return;
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setIsStartingChat(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/chat/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || "Не удалось открыть чат");
      }

      const data = await response.json();
      navigate(`/chat/${data._id}`);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Ошибка открытия чата");
    } finally {
      setIsStartingChat(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Loader />
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="container mx-auto px-4 py-8">
        {error ? <ErrorMessage message={error} /> : <p>Объявление не найдено</p>}
      </div>
    );
  }

  const images = useMemo(() => {
    if (!ad) return [];
    if (Array.isArray(ad.images) && ad.images.length) return ad.images;
    if (Array.isArray(ad.photos)) return ad.photos;
    return [];
  }, [ad]);

  const isOwner = useMemo(() => {
    if (!ad || !currentUser?.telegramId) return false;
    return Number(currentUser.telegramId) === Number(ad.sellerTelegramId);
  }, [ad, currentUser?.telegramId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="overflow-hidden">
          <AdGallery images={images} />
          <CardHeader>
            <CardTitle>{ad.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ad.price != null && <p className="text-2xl font-bold">{ad.price} BYN</p>}
            {ad.description && <p className="text-muted-foreground">{ad.description}</p>}
            {(ad.category || ad.subcategory) && (
              <p className="text-sm text-muted-foreground">
                {ad.category && <span>Категория: {ad.category}</span>}
                {ad.subcategory && <span className="ml-2">Подкатегория: {ad.subcategory}</span>}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={startChat} disabled={isStartingChat}>
                {isStartingChat ? "Открываем чат..." : "Написать продавцу"}
              </Button>
              {isOwner && (
                <Button variant="secondary" asChild>
                  <Link to={`/ads/${ad._id}/edit`}>Управлять фото</Link>
                </Button>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
