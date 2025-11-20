import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthContext";

type Tab = "sms" | "telegram";
type TelegramStatus = "idle" | "pending" | "completed" | "not_found";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setToken, setCurrentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("sms");

  // SMS state
  const [smsStep, setSmsStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("+");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [smsLoading, setSmsLoading] = useState(false);

  // Shared state
  const [error, setError] = useState<string | null>(null);

  // Telegram state
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [pollingToken, setPollingToken] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<TelegramStatus>("idle");
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const normalizeError = (message: unknown) => {
    if (message instanceof Error) {
      setError(message.message || "Произошла ошибка, попробуйте ещё раз");
      return;
    }

    if (typeof message === "string") {
      setError(message);
      return;
    }

    setError("Произошла ошибка, попробуйте ещё раз");
  };

  const requestCode = async () => {
    setSmsLoading(true);
    setError(null);
    setDevCode(null);
    try {
      const response = await fetch("/api/auth/sms/requestCode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Не удалось отправить код");
      }

      setDevCode(data?.code || null);
      setSmsStep(2);
    } catch (requestError) {
      normalizeError(requestError);
    } finally {
      setSmsLoading(false);
    }
  };

  const handleSmsLogin = async () => {
    setSmsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/sms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Не удалось выполнить вход");
      }

      setToken(data.token);
      setCurrentUser(data.user);
      navigate("/account");
    } catch (requestError) {
      normalizeError(requestError);
    } finally {
      setSmsLoading(false);
    }
  };

  const pollTelegramLogin = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/telegram/poll?token=${token}`);
      const data = await response.json();

      if (data.status === "completed" && data.jwtToken) {
        setPollingStatus("completed");
        stopPolling();
        setToken(data.jwtToken);
        setCurrentUser(data.user);
        navigate("/account");
      } else if (data.status === "not_found") {
        setPollingStatus("not_found");
        stopPolling();
      } else {
        setPollingStatus("pending");
      }
    } catch (requestError) {
      normalizeError(requestError);
      stopPolling();
    }
  };

  const startPolling = (token: string) => {
    stopPolling();
    setPollingStatus("pending");
    void pollTelegramLogin(token);
    pollingInterval.current = setInterval(() => {
      void pollTelegramLogin(token);
    }, 3000);
  };

  const startTelegramLogin = async () => {
    setTelegramLoading(true);
    setError(null);
    setPollingToken(null);
    setDeepLink(null);
    setPollingStatus("idle");

    try {
      const response = await fetch("/api/auth/telegram/create-session", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Не удалось создать сессию Telegram");
      }

      setPollingToken(data.token);
      setDeepLink(data.deepLink);
      startPolling(data.token);
      window.open(data.deepLink, "_blank");
    } catch (requestError) {
      normalizeError(requestError);
      stopPolling();
    } finally {
      setTelegramLoading(false);
    }
  };

  const renderSms = () => (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Введите номер телефона, получите код и подтвердите его, чтобы войти в личный кабинет.
      </p>

      {smsStep === 1 ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void requestCode();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+375291234567"
            />
          </div>

          <Button type="submit" disabled={smsLoading} className="w-full">
            {smsLoading ? "Отправляем..." : "Получить код"}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSmsLogin();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="code">Код из SMS</Label>
            <Input
              id="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="1234"
            />
            {devCode && <p className="text-xs text-muted-foreground">Код: {devCode}</p>}
          </div>

          <Button type="submit" disabled={smsLoading} className="w-full">
            {smsLoading ? "Входим..." : "Войти"}
          </Button>

          <button type="button" className="text-sm text-primary" onClick={() => setSmsStep(1)}>
            Вернуться к вводу телефона
          </button>
        </form>
      )}
    </div>
  );

  const renderTelegram = () => (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Нажмите «Войти через Telegram», подтвердите номер в боте и вернитесь на сайт. Мы автоматически обновим профиль и
        сохраним токен.
      </p>

      <Button onClick={() => void startTelegramLogin()} disabled={telegramLoading} className="w-full">
        {telegramLoading ? "Создаём сессию..." : "Войти через Telegram"}
      </Button>

      {deepLink && (
        <div className="rounded-md border p-3 text-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">Ссылка на бота</span>
            <a href={deepLink} className="text-primary underline" target="_blank" rel="noreferrer">
              Открыть бота
            </a>
          </div>
          <p className="text-muted-foreground text-xs">Ожидаем подтверждение телефона в Telegram…</p>
        </div>
      )}

      {pollingStatus === "pending" && (
        <p className="text-sm text-muted-foreground">Проверяем подтверждение раз в 3 секунды…</p>
      )}

      {pollingStatus === "not_found" && (
        <p className="text-sm text-red-600">Сессия не найдена или истекла. Попробуйте начать заново.</p>
      )}

      {pollingToken && pollingStatus === "pending" && (
        <Button variant="outline" onClick={stopPolling} className="w-full">
          Остановить ожидание
        </Button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Вход в личный кабинет</CardTitle>
            <div className="flex gap-2">
              <Button variant={activeTab === "sms" ? "default" : "outline"} onClick={() => setActiveTab("sms")}>
                SMS
              </Button>
              <Button
                variant={activeTab === "telegram" ? "default" : "outline"}
                onClick={() => {
                  setActiveTab("telegram");
                  stopPolling();
                  setPollingStatus("idle");
                }}
              >
                Telegram
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {activeTab === "sms" ? renderSms() : renderTelegram()}
        </CardContent>
      </Card>
    </div>
  );
}
