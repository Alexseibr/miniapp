import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchWithAuth, getAuthToken } from "@/lib/auth";
import { useAuth } from "@/features/auth/AuthContext";

interface Message {
  _id: string;
  text: string;
  sender: string;
  createdAt: string;
}

function formatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [since, setSince] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasToken = Boolean(getAuthToken());

  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const appendMessages = useCallback((incoming: Message[]) => {
    if (!incoming?.length) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((msg) => msg._id));
      const merged = [...prev];
      incoming.forEach((msg) => {
        if (!existingIds.has(msg._id)) {
          merged.push(msg);
        }
      });
      return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!conversationId || !hasToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/chat/${conversationId}/messages`);
      if (!response.ok) {
        throw new Error("Не удалось загрузить сообщения");
      }
      const data = await response.json();
      const normalized = Array.isArray(data) ? data : [];
      setMessages(normalized);
      const last = normalized[normalized.length - 1];
      setSince(last?.createdAt || null);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Ошибка загрузки сообщений");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, hasToken]);

  const pollMessages = useCallback(async () => {
    if (!conversationId || !hasToken) return;
    const query = since ? `?since=${encodeURIComponent(since)}` : "";
    try {
      const response = await fetchWithAuth(`/api/chat/${conversationId}/poll${query}`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data?.messages) && data.messages.length) {
        appendMessages(data.messages);
      }
      if (data?.newSince) {
        setSince(data.newSince);
      }
    } catch (err) {
      console.error("Polling error", err);
    }
  }, [appendMessages, conversationId, hasToken, since]);

  useEffect(() => {
    void loadMessages();

    pollRef.current = setInterval(() => {
      void pollMessages();
    }, 2500);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [loadMessages, pollMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!conversationId || !text.trim() || !hasToken) return;
    setIsSending(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/chat/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || "Не удалось отправить сообщение");
      }

      const data = await response.json();
      appendMessages([data]);
      setText("");
      setSince(data?.createdAt || since);
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
          <CardContent className="p-6 text-muted-foreground">Войдите, чтобы просматривать эту страницу.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="h-[70vh] flex flex-col">
          <CardHeader>
            <CardTitle>Чат</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex-1 overflow-y-auto rounded-md border p-3 space-y-3 bg-muted/20">
              {isLoading && <p className="text-muted-foreground">Загружаем сообщения...</p>}
              {!isLoading && messages.length === 0 && <p className="text-muted-foreground">Пока нет сообщений</p>}
              {messages.map((message) => {
                const isMine = currentUser && (message.sender === currentUser._id || message.sender === currentUser.id);
                return (
                  <div
                    key={message._id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                        isMine ? "bg-blue-100 text-right" : "bg-gray-200 text-left"
                      }`}
                    >
                      <div>{message.text}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{formatTime(message.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
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
              <Button onClick={sendMessage} disabled={isSending || !text.trim()}>
                {isSending ? "Отправляем..." : "Отправить"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
