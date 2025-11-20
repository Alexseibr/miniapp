import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWithAuth, getAuthToken } from "@/lib/auth";
import Loader from "@/components/Loader";

export default function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const hasToken = Boolean(getAuthToken());

  useEffect(() => {
    if (!hasToken) return;

    const checkAccess = async () => {
      setIsCheckingUser(true);
      setUserError(null);
      try {
        const response = await fetchWithAuth("/api/users/me");
        if (!response.ok) {
          throw new Error("Не удалось получить профиль пользователя");
        }
        const data = await response.json();
        setIsAdmin(data?.role === "admin");
      } catch (error) {
        console.error(error);
        setUserError("Не удалось подтвердить права администратора");
        setIsAdmin(false);
      } finally {
        setIsCheckingUser(false);
      }
    };

    void checkAccess();
  }, [hasToken]);

  const { data: stats, isLoading } = useQuery<{
    totalProducts: number;
    activeListings: number;
    totalOrders: number;
    totalRevenue: string;
  }>({
    queryKey: ["/api/stats"],
    enabled: isAdmin,
  });

  if (!hasToken) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardContent className="p-6 text-muted-foreground">Войдите, чтобы просматривать эту страницу.</CardContent>
        </Card>
      </div>
    );
  }

  if (isCheckingUser) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Loader />
      </div>
    );
  }

  if (userError || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            {userError || "Доступ запрещён"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Products",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      testId: "stat-total-products",
    },
    {
      title: "Active Listings",
      value: stats?.activeListings ?? 0,
      icon: TrendingUp,
      testId: "stat-active-listings",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      testId: "stat-total-orders",
    },
    {
      title: "Revenue",
      value: stats?.totalRevenue ? `$${stats.totalRevenue}` : "$0.00",
      icon: Users,
      testId: "stat-revenue",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-dashboard">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of your marketplace
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} data-testid={stat.testId}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid={`value-${stat.testId}`}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="card-welcome">
        <CardHeader>
          <CardTitle>Welcome to your Marketplace Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            Manage your products, categories, and orders from this dashboard.
          </p>
          <p className="text-muted-foreground">
            Your Telegram bot is connected and ready to serve customers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
