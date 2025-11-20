import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchWithAuth, getAuthToken } from "@/lib/auth";

interface Message {
  _id: string;
  text: string;
  sender: string;
  createdAt: string;
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const hasToken = Boolean(getAuthToken());

  const loadMessages = useCallback(async () => {
    if (!conversationId || !hasToken) return;
    setIsLoading(true);

    try {
      const response = await fetchWithAuth(`/api/chat/conversations/${conversationId}/messages`);
      if (!response.ok) {
        throw new Error("Не удалось загрузить сообщения");
      }
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Ошибка загрузки сообщений");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, hasToken]);

  useEffect(() => {
    void loadMessages();

    pollRef.current = setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [loadMessages]);

  const sendMessage = async () => {
    if (!conversationId || !text.trim() || !hasToken) return;
    setIsSending(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || "Не удалось отправить сообщение");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, data]);
      setText("");
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Ошибка отправки сообщения");
    } finally {
      setIsSending(false);
    }
  };

  if (!hasToken) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Войдите, чтобы просматривать эту страницу.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Чат с продавцом</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto rounded-md border p-3 space-y-2">
              {isLoading && <p className="text-muted-foreground">Загружаем сообщения...</p>}
              {!isLoading && messages.length === 0 && <p className="text-muted-foreground">Пока нет сообщений</p>}
              {messages.map((message) => (
                <div key={message._id} className="p-2 rounded-md bg-muted">
                  <p className="text-sm text-muted-foreground">
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите сообщение"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button onClick={sendMessage} disabled={isSending}>
                {isSending ? "Отправляем..." : "Отправить"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
