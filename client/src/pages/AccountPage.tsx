import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import AdCard from "@/components/AdCard";
import { useAuth } from "@/context/AuthContext";
import type { Ad } from "@/types/ad";

function AccountProfileTab({ onUpdate }: { onUpdate: (user: any) => void }) {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    avatar: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setForm({
        name: currentUser.name || "",
        email: currentUser.email || "",
        avatar: currentUser.avatar || "",
      });
    }
  }, [currentUser]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await api.put("/users/me", form);
      onUpdate(data);
      setMessage("Профиль обновлен");
    } catch (requestError) {
      setMessage("Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return <p>Загрузка...</p>;

  return (
    <div className="card">
      <h3>Профиль</h3>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Имя
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Email
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Avatar URL
          <input value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} />
        </label>
        <label>
          Телефон
          <input value={currentUser.phone || ""} readOnly />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </form>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}

function AccountMyAdsTab() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ads/my");
      setAds(Array.isArray(data) ? data : data.items ?? []);
    } catch (requestError) {
      console.error(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="card">
      <h3>Мои объявления</h3>
      {loading && <p className="muted">Загрузка…</p>}
      {ads.map((ad) => (
        <AdCard key={ad._id} ad={ad} isFavorite={false} onToggleFavorite={() => undefined} />
      ))}
      {!loading && !ads.length && <p className="muted">У вас пока нет объявлений</p>}
      <Link to="/ads/new" className="app-button">
        Добавить объявление
      </Link>
    </div>
  );
}

function AccountFavoritesTab() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await api.get("/favorites/my");
      const list: Ad[] = Array.isArray(data)
        ? data.map((item: any) => item?.ad ?? item).filter(Boolean)
        : [];
      setAds(list);
    } catch (requestError) {
      console.error(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const toggleFavorite = async (adId: string) => {
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      await api.delete(`/favorites/${adId}`);
      setAds((prev) => prev.filter((item) => item._id !== adId));
    } catch (requestError) {
      console.error(requestError);
    }
  };

  return (
    <div className="card">
      <h3>Избранное</h3>
      {loading && <p className="muted">Загрузка…</p>}
      {ads.map((ad) => (
        <AdCard key={ad._id} ad={ad} isFavorite onToggleFavorite={toggleFavorite} />
      ))}
      {!loading && !ads.length && <p className="muted">Избранное пусто</p>}
    </div>
  );
}

function AccountChatsTab() {
  const navigate = useNavigate();
  const [dialogs, setDialogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/chat/my");
        setDialogs(Array.isArray(data) ? data : data.items ?? []);
      } catch (requestError) {
        console.error(requestError);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="card">
      <h3>Чаты</h3>
      {loading && <p className="muted">Загрузка…</p>}
      <ul className="list">
        {dialogs.map((dialog) => (
          <li key={dialog._id} onClick={() => navigate(`/chat/${dialog._id}`)} className="list-item">
            <div>
              <strong>{dialog.ad?.title}</strong>
              {dialog.lastMessage && <p className="muted">{dialog.lastMessage.text}</p>}
            </div>
            {dialog.updatedAt && <span className="muted">{new Date(dialog.updatedAt).toLocaleString()}</span>}
          </li>
        ))}
      </ul>
      {!loading && !dialogs.length && <p className="muted">Чатов пока нет</p>}
    </div>
  );
}

export default function AccountPage() {
  const { token, currentUser, loadingUser, refreshUser } = useAuth();
  const [tab, setTab] = useState<"profile" | "ads" | "favorites" | "chats">("profile");

  useEffect(() => {
    if (token && !currentUser) {
      void refreshUser();
    }
  }, [currentUser, refreshUser, token]);

  if (!token) {
    return (
      <div className="page">
        <p>Войдите, чтобы увидеть личный кабинет.</p>
        <Link to="/login" className="app-button">
          Войти
        </Link>
      </div>
    );
  }

  if (loadingUser) return <div className="loader">Загрузка…</div>;

  return (
    <div className="page">
      <h1>Личный кабинет</h1>
      <div className="tabs">
        <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>Профиль</button>
        <button className={tab === "ads" ? "active" : ""} onClick={() => setTab("ads")}>Мои объявления</button>
        <button
          className={tab === "favorites" ? "active" : ""}
          onClick={() => setTab("favorites")}
        >
          Избранное
        </button>
        <button className={tab === "chats" ? "active" : ""} onClick={() => setTab("chats")}>Чаты</button>
      </div>

      {tab === "profile" && <AccountProfileTab onUpdate={() => void refreshUser()} />}
      {tab === "ads" && <AccountMyAdsTab />}
      {tab === "favorites" && <AccountFavoritesTab />}
      {tab === "chats" && <AccountChatsTab />}
    </div>
  );
}
