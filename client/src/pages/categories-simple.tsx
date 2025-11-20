import { useQuery } from "@tanstack/react-query";
import { FolderTree } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Category {
  slug: string;
  name: string;
  parentSlug?: string | null;
  subcategories?: Category[];
}

export default function Categories() {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const renderCategory = (cat: Category, level = 0) => (
    <div key={cat.slug} style={{ marginLeft: `${level * 24}px` }} className="mb-2">
      <Card className="hover-elevate" data-testid={`card-category-${cat.slug}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderTree className="h-5 w-5 text-purple-600" />
              <span className="font-medium" data-testid={`text-name-${cat.slug}`}>{cat.name}</span>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{cat.slug}</Badge>
              {cat.subcategories && cat.subcategories.length > 0 && (
                <Badge variant="secondary">
                  {cat.subcategories.length} подкатегорий
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {cat.subcategories?.map((sub) => renderCategory(sub, level + 1))}
    </div>
  );

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
          <FolderTree className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Категории</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Иерархия категорий</span>
              <Badge variant="secondary" data-testid="badge-total">
                Всего: {categories?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!categories?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderTree className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Нет категорий</p>
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => renderCategory(cat))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
