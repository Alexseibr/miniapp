import { Heart } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Ad } from "@/types/ad";

interface AdCardProps {
  ad: Ad;
  isFavorite: boolean;
  onToggleFavorite: (adId: string) => Promise<void> | void;
}

export function AdCard({ ad, isFavorite, onToggleFavorite }: AdCardProps) {
  const previewImage = ad.images?.[0] || ad.photos?.[0];

  return (
    <Card className="hover-elevate overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1fr,180px]">
        {previewImage ? (
          <div className="relative h-48 md:h-full bg-muted/40">
            <img
              src={previewImage}
              alt={ad.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-full min-h-[120px] bg-muted/40 flex items-center justify-center text-muted-foreground">
            Нет фото
          </div>
        )}

        <CardContent className="p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold leading-tight">{ad.title}</h3>
                {ad.category && (
                  <p className="text-sm text-muted-foreground">Категория: {ad.category}</p>
                )}
                {ad.subcategory && (
                  <p className="text-sm text-muted-foreground">Подкатегория: {ad.subcategory}</p>
                )}
              </div>

              <button
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm border transition-colors ${
                  isFavorite
                    ? "bg-pink-100 text-pink-600 border-pink-200"
                    : "text-muted-foreground border-border hover:bg-muted"
                }`}
                aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                onClick={async (event) => {
                  event.stopPropagation();
                  await onToggleFavorite(ad._id);
                }}
              >
                <Heart
                  className={`h-4 w-4 ${isFavorite ? "fill-pink-500 text-pink-500" : ""}`}
                />
                {isFavorite ? "В избранном" : "В избранное"}
              </button>
            </div>

            {ad.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">{ad.description}</p>
            )}

            {ad.price != null && (
              <p className="text-2xl font-bold text-green-600">{ad.price} BYN</p>
            )}

            {(ad.category || ad.subcategory) && (
              <div className="flex flex-wrap gap-2">
                {ad.category && <Badge variant="secondary">{ad.category}</Badge>}
                {ad.subcategory && <Badge variant="outline">{ad.subcategory}</Badge>}
              </div>
            )}
          </div>

          {ad.location?.address && (
            <p className="text-xs text-muted-foreground">{ad.location.address}</p>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

export default AdCard;
