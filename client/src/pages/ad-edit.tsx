import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";
import ErrorMessage from "@/components/ErrorMessage";
import { fetchWithAuth } from "@/lib/auth";
import { ImageUploader } from "@/components/ImageUploader";
import type { Ad } from "@/types/ad";
import { useAuth } from "@/features/auth/AuthContext";

export default function AdEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadAd = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(`/api/ads/${id}`);
        if (!response.ok) {
          throw new Error("Не удалось загрузить объявление");
        }
        const data = await response.json();
        const adData: Ad = data?.ad ?? data;
        setAd(adData);
        setImages(adData.images?.length ? adData.images : adData.photos ?? []);
      } catch (err) {
        setError((err as Error).message || "Ошибка загрузки объявления");
      } finally {
        setIsLoading(false);
      }
    };

    void loadAd();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    if (!currentUser?.telegramId) {
      setError("Авторизуйтесь, чтобы управлять фотографиями");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithAuth(`/api/ads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, sellerTelegramId: currentUser?.telegramId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Не удалось обновить объявление");
      }

      const updated = await response.json();
      setAd(updated);
      setImages(updated.images?.length ? updated.images : updated.photos ?? []);
      setSuccess("Галерея обновлена");
    } catch (err) {
      setError((err as Error).message || "Ошибка сохранения галереи");
    } finally {
      setIsSaving(false);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Управление фото</h1>
            <p className="text-muted-foreground">Обновите галерею объявления {ad.title}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Назад
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Галерея</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploader value={images} onChange={setImages} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Сохраняем..." : "Сохранить изменения"}
              </Button>
              <Button variant="secondary" asChild>
                <Link to={`/ads/${ad._id}`}>Открыть объявление</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
