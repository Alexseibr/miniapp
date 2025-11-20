import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Ad } from "@/types/ad";
import { fetchWithAuth } from "@/lib/auth";

export default function AdDetails() {
  const [, params] = useRoute("/ads/:id");
  const [, navigate] = useLocation();
  const adId = params?.id;
  const [ad, setAd] = useState<Ad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

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
        setAd(data);
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
    setIsStartingChat(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/chat/conversations`, {
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
        <p>Загрузка объявления...</p>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{error || "Объявление не найдено"}</p>
      </div>
    );
  }

  const preview = ad.images?.[0] || ad.photos?.[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          {preview && (
            <div className="h-80 bg-muted/40">
              <img src={preview} alt={ad.title} className="w-full h-full object-cover" />
            </div>
          )}
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
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
