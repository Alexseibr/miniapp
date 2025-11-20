import { Heart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFavorites } from "./FavoritesContext";

export function FavoritesPage() {
  const { favorites } = useFavorites();

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="h-8 w-8 text-pink-600" />
        <div>
          <h1 className="text-3xl font-bold">Избранные объявления</h1>
          <p className="text-muted-foreground">
            Объявления, которые вы сохранили для быстрого доступа
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ваш список</CardTitle>
        </CardHeader>
        <CardContent>
          {!favorites.length ? (
            <p className="text-muted-foreground">У вас пока нет избранных объявлений.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                TODO: подключить реальный API, когда он будет готов (например, GET
                /api/ads/byIds?ids=...)
              </p>
              <ul className="list-disc list-inside">
                {favorites.map((id) => (
                  <li key={id} className="font-mono text-sm">
                    {id}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default FavoritesPage;
