import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Star, UserRound, Wallet } from "lucide-react";

import AdCard from "@/components/AdCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFavorites } from "@/features/favorites/FavoritesContext";
import { fetchWithAuth, getAuthToken } from "@/lib/auth";
import type { Ad } from "@/types/ad";
import type { CurrentUser } from "@/types/user";

const tabs = [
  { key: "profile", label: "Профиль", icon: UserRound },
  { key: "ads", label: "Мои объявления", icon: Wallet },
  { key: "favorites", label: "Избранное", icon: Star },
  { key: "chats", label: "Мои чаты", icon: MessageSquare },
];

function AccountProfileTab({
  user,
  onUserUpdate,
}: {
  user: CurrentUser | null;
  onUserUpdate: (user: CurrentUser) => void;
}) {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    avatar: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormState({
        name: user.name || user.firstName || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetchWithAuth("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Не удалось обновить профиль");
      }

      const updatedUser = await response.json();
      onUserUpdate(updatedUser);
      setMessage("Профиль обновлён");
    } catch (requestError) {
      setError((requestError as Error).message || "Ошибка обновления профиля");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <p className="text-muted-foreground">Загружаем профиль…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Мой профиль</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ваше имя"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formState.email}
                onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="example@mail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                value={formState.avatar}
                onChange={(e) => setFormState((prev) => ({ ...prev, avatar: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" value={user.phone || "не указан"} readOnly />
            </div>
          </div>

          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Сохраняем..." : "Сохранить"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AccountMyAdsTab({ isActive }: { isActive: boolean }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAds = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/api/ads/my");
      if (!response.ok) {
        throw new Error("Не удалось загрузить ваши объявления");
      }
      const data = await response.json();
      setAds(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError((requestError as Error).message || "Ошибка загрузки объявлений");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      void loadAds();
    }
  }, [isActive]);

  const handleDelete = async (adId: string) => {
    const confirmed = window.confirm("Удалить объявление?");
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/api/ads/${adId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Не удалось удалить объявление");
      }
      setAds((prev) => prev.filter((ad) => ad._id !== adId));
    } catch (requestError) {
      alert((requestError as Error).message || "Ошибка удаления объявления");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Мои объявления</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-muted-foreground">Загружаем ваши объявления…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!isLoading && !ads.length && !error && (
          <p className="text-muted-foreground">У вас пока нет объявлений.</p>
        )}

        <div className="space-y-3">
          {ads.map((ad) => {
            const preview = ad.images?.[0] || ad.photos?.[0];
            return (
              <Card key={ad._id} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-[1fr,180px]">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold">{ad.title}</h3>
                        {ad.status && <Badge variant="outline">{ad.status}</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/ads/${ad._id}/edit`}>
                          <Button variant="outline" size="sm">Редактировать</Button>
                        </Link>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(ad._id)}>
                          Удалить
                        </Button>
                      </div>
                    </div>

                    {ad.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{ad.description}</p>
                    )}

                    {ad.price != null && (
                      <p className="text-lg font-bold">{ad.price} {ad.currency || "BYN"}</p>
                    )}
                  </div>

                  <div className="h-full min-h-[160px] bg-muted/40 flex items-center justify-center">
                    {preview ? (
                      <img
                        src={preview}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-muted-foreground">Нет фото</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AccountFavoritesTab({ isActive }: { isActive: boolean }) {
  const { favorites, isFavorite, toggleFavorite, refreshFavorites } = useFavorites();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const loadFavorites = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth("/api/favorites/my");
        if (!response.ok) {
          throw new Error("Не удалось загрузить избранное");
        }
        const data = await response.json();
        const adsData: Ad[] = Array.isArray(data)
          ? data.map((item: any) => item?.adId || item?.ad || item).filter(Boolean)
          : [];
        setAds(adsData);
        await refreshFavorites();
      } catch (requestError) {
        setError((requestError as Error).message || "Ошибка загрузки избранного");
      } finally {
        setIsLoading(false);
      }
    };

    void loadFavorites();
  }, [isActive, refreshFavorites]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Избранное</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-muted-foreground">Загружаем избранное…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!isLoading && !ads.length && !error && (
          <p className="text-muted-foreground">У вас пока нет избранных объявлений.</p>
        )}

        <div className="space-y-3">
          {ads.map((ad) => (
            <AdCard
              key={ad._id}
              ad={ad}
              isFavorite={isFavorite(ad._id) || favorites.includes(ad._id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type ConversationPreview = {
  _id: string;
  ad?: {
    _id: string;
    title?: string;
    price?: number;
    status?: string;
    photos?: string[];
  } | null;
  buyer?: CurrentUser | null;
  seller?: CurrentUser | null;
  lastMessage?: {
    _id: string;
    text: string;
    createdAt: string;
    sender?: CurrentUser | null;
  } | null;
  updatedAt?: string;
};

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `Сегодня, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (isYesterday) return `Вчера, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return date.toLocaleDateString();
}

function AccountChatsTab({ isActive, currentUser }: { isActive: boolean; currentUser: CurrentUser | null }) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isActive) return;

    const loadConversations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth("/api/chat/my");
        if (!response.ok) {
          throw new Error("Не удалось загрузить диалоги");
        }
        const data = await response.json();
        setConversations(Array.isArray(data) ? data : []);
      } catch (requestError) {
        setError((requestError as Error).message || "Ошибка загрузки чатов");
      } finally {
        setIsLoading(false);
      }
    };

    void loadConversations();
  }, [isActive]);

  const renderCompanion = (conversation: ConversationPreview) => {
    if (!currentUser) return conversation.seller || conversation.buyer;
    if (conversation.buyer?.id === currentUser.id || conversation.buyer?._id === currentUser.id) {
      return conversation.seller;
    }
    return conversation.buyer;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Мои диалоги</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-muted-foreground">Загружаем диалоги…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!isLoading && !conversations.length && !error && (
          <p className="text-muted-foreground">У вас пока нет переписок.</p>
        )}

        <div className="space-y-3">
          {conversations.map((conversation) => {
            const companion = renderCompanion(conversation);
            const lastMessageText = conversation.lastMessage?.text || "Нет сообщений";
            const preview = lastMessageText.length > 80 ? `${lastMessageText.slice(0, 80)}…` : lastMessageText;
            const previewImage = conversation.ad?.photos?.[0];

            return (
              <Card
                key={conversation._id}
                className="hover-elevate cursor-pointer"
                onClick={() => navigate(`/chat/${conversation._id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted/40 rounded-md overflow-hidden flex items-center justify-center">
                    {previewImage ? (
                      <img src={previewImage} alt={conversation.ad?.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground text-xs">Нет фото</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{conversation.ad?.title || "Объявление"}</h3>
                      {conversation.ad?.price != null && (
                        <span className="text-sm text-muted-foreground">{conversation.ad.price} BYN</span>
                      )}
                      {conversation.ad?.status && <Badge variant="outline">{conversation.ad.status}</Badge>}
                    </div>

                    {companion && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={companion.avatar} alt={companion.name} />
                          <AvatarFallback>{companion.name?.slice(0, 1) || "?"}</AvatarFallback>
                        </Avatar>
                        <span>
                          {conversation.buyer?.id === currentUser?.id || conversation.buyer?._id === currentUser?.id
                            ? "Продавец"
                            : "Покупатель"}
                          : {companion.name || companion.username}
                        </span>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">{preview}</p>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {formatTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<string>(tabs[0].key);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasToken = Boolean(getAuthToken());

  useEffect(() => {
    if (!hasToken) return;

    const loadUser = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth("/api/users/me");
        if (!response.ok) {
          throw new Error("Не удалось загрузить профиль");
        }
        const data = await response.json();
        setUser(data);
      } catch (requestError) {
        setError((requestError as Error).message || "Ошибка загрузки профиля");
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [hasToken]);

  if (!hasToken) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-4">
        <h1 className="text-3xl font-bold">Личный кабинет</h1>
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Войдите, чтобы просматривать личный кабинет.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Личный кабинет</h1>
        <p className="text-muted-foreground">
          Управляйте профилем, объявлениями, избранным и чатами в одном месте.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-4">
            {isLoading && <p className="text-muted-foreground">Загружаем данные…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {!isLoading && !error && (
              <div className="space-y-4">
                {activeTab === "profile" && (
                  <AccountProfileTab user={user} onUserUpdate={setUser} />
                )}
                {activeTab === "ads" && <AccountMyAdsTab isActive={activeTab === "ads"} />}
                {activeTab === "favorites" && <AccountFavoritesTab isActive={activeTab === "favorites"} />}
                {activeTab === "chats" && (
                  <AccountChatsTab isActive={activeTab === "chats"} currentUser={user} />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
