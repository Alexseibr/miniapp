import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

type Tab = "sms" | "telegram";

type TelegramPollResponse = {
  status: string;
  jwtToken?: string;
  user?: any;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>("sms");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<string>("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const requestSmsCode = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/sms/requestCode", { phone });
    } catch (requestError) {
      setError("Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  };

  const submitSmsLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/auth/sms/login", { phone, code });
      if (data?.token && data?.user) {
        login(data.token, data.user);
        navigate("/account");
      }
    } catch (requestError) {
      setError("Неверный код или телефон");
    } finally {
      setLoading(false);
    }
  };

  const startTelegram = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/auth/telegram/create-session");
      setTelegramToken(data?.token);
      if (data?.deepLink) {
        window.open(data.deepLink, "_blank");
      }
      pollingRef.current = setInterval(async () => {
        if (!data?.token) return;
        try {
          const poll = await api.get<TelegramPollResponse>("/auth/telegram/poll", { params: { token: data.token } });
          if (poll.data.status === "completed" && poll.data.jwtToken && poll.data.user) {
            login(poll.data.jwtToken, poll.data.user);
            if (pollingRef.current) clearInterval(pollingRef.current);
            navigate("/account");
          } else {
            setTelegramStatus(poll.data.status);
          }
        } catch (pollError) {
          console.error(pollError);
        }
      }, 3000);
    } catch (requestError) {
      setError("Не удалось создать сессию Telegram");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <h1>Вход</h1>
      <div className="tabs">
        <button className={tab === "sms" ? "active" : ""} onClick={() => setTab("sms")}>
          Вход по SMS
        </button>
        <button className={tab === "telegram" ? "active" : ""} onClick={() => setTab("telegram")}>
          Вход через Telegram
        </button>
      </div>

      {tab === "sms" && (
        <div className="card">
          <label>
            Телефон
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+375..." />
          </label>
          <button onClick={requestSmsCode} disabled={loading}>
            Получить код
          </button>
          <label>
            Код
            <input value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button onClick={submitSmsLogin} disabled={loading}>
            Войти
          </button>
        </div>
      )}

      {tab === "telegram" && (
        <div className="card">
          <button onClick={startTelegram} disabled={loading}>
            Войти через Telegram
          </button>
          {telegramToken && <p className="muted">Ожидаем подтверждение в Telegram… {telegramStatus}</p>}
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
