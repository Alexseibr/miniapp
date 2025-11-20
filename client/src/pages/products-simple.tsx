import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Ad {
  _id: string;
  title: string;
  description?: string;
  price: number;
  categoryId: string;
  status: string;
  createdAt: string;
}

export default function Products() {
  const { data: ads, isLoading } = useQuery<{ items: Ad[]; total: number }>({
    queryKey: ["/api/ads"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Package className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold">Товары</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Список объявлений</span>
              <Badge variant="secondary" data-testid="badge-total">
                Всего: {ads?.total || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!ads?.items?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Нет активных объявлений</p>
                <p className="text-sm mt-2">Создайте первое объявление через Telegram бота</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ads.items.map((ad) => (
                  <Card key={ad._id} className="hover-elevate" data-testid={`card-product-${ad._id}`}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2" data-testid={`text-title-${ad._id}`}>
                            {ad.title}
                          </h3>
                          {ad.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {ad.description}
                            </p>
                          )}
                          <div className="flex gap-2 items-center">
                            <Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>
                              {ad.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(ad.createdAt).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600" data-testid={`text-price-${ad._id}`}>
                            {ad.price} BYN
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {ad._id.slice(-6)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
