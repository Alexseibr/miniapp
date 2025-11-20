import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWithAuth } from "@/lib/auth";
import type { CurrentUser } from "@/types/user";

interface ConversationPreview {
  _id: string;
  ad: {
    _id: string;
    title: string;
    price?: number;
    images?: string[];
  } | null;
  interlocutor: {
    _id: string;
    phone?: string;
    telegramUsername?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
  } | null;
  lastMessage: {
    _id: string;
    text: string;
    createdAt: string;
    sender: string;
  } | null;
}

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

export default function AccountChatsTab({ isActive, currentUser }: { isActive: boolean; currentUser: CurrentUser | null }) {
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

  const renderCompanion = (conversation: ConversationPreview) => conversation.interlocutor;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Мои диалоги
        </CardTitle>
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
            const previewImage = conversation.ad?.images?.[0];

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
                      {companion && <Badge variant="outline">{companion.telegramUsername || companion.phone || "Собеседник"}</Badge>}
                    </div>

                    {companion && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={companion.avatar ?? undefined}
                            alt={companion.firstName ?? companion.username ?? undefined}
                          />
                          <AvatarFallback>
                            {companion.firstName?.[0] || companion.username?.[0] || companion.telegramUsername?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {companion.firstName || companion.username || companion.telegramUsername || companion.phone || "Пользователь"}
                        </span>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">{preview}</p>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {formatTime(conversation.lastMessage?.createdAt)}
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
