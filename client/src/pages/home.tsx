import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home as HomeIcon, ShoppingBag, LayoutDashboard, FolderTree } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            KETMAR Market
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Telegram-маркетплейс для объявлений
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Link href="/dashboard">
            <Card className="hover-elevate active-elevate-2 cursor-pointer h-full" data-testid="card-dashboard">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="h-8 w-8 text-blue-600" />
                  <CardTitle>Dashboard</CardTitle>
                </div>
                <CardDescription>
                  Статистика и аналитика маркетплейса
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Просмотр общей статистики, графиков продаж и активности пользователей
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/products">
            <Card className="hover-elevate active-elevate-2 cursor-pointer h-full" data-testid="card-products">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-8 w-8 text-green-600" />
                  <CardTitle>Товары</CardTitle>
                </div>
                <CardDescription>
                  Управление объявлениями
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Просмотр, создание и редактирование товаров маркетплейса
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/categories">
            <Card className="hover-elevate active-elevate-2 cursor-pointer h-full" data-testid="card-categories">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FolderTree className="h-8 w-8 text-purple-600" />
                  <CardTitle>Категории</CardTitle>
                </div>
                <CardDescription>
                  Иерархия категорий
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Управление структурой категорий и подкатегорий товаров
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <HomeIcon className="h-6 w-6" />
                API Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <p className="font-semibold text-sm mb-2">Доступные endpoints:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• GET /api/categories</li>
                    <li>• GET /api/seasons</li>
                    <li>• GET /api/ads</li>
                    <li>• GET /api/orders</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-2">Статус сервисов:</p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      <span>API Server</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      <span>MongoDB</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      <span>Telegram Bot</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" asChild data-testid="button-api-docs">
                  <a href="/health" target="_blank" rel="noopener noreferrer">
                    Health Check
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
