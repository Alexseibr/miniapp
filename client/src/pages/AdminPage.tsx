import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type { Ad } from "@/types/ad";

function AdminAdsTab() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const loadAds = async () => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (search) params.q = search;
    const { data } = await api.get("/admin/ads", { params });
    setAds(Array.isArray(data) ? data : data.items ?? []);
  };

  useEffect(() => {
    void loadAds();
  }, []);

  const updateStatus = async (adId: string, status: string) => {
    await api.patch(`/admin/ads/${adId}/status`, { status });
    await loadAds();
  };

  return (
    <div className="card">
      <h3>Объявления</h3>
      <div className="filters">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Все</option>
          <option value="active">Активные</option>
          <option value="pending">На модерации</option>
        </select>
        <button onClick={loadAds}>Применить</button>
      </div>
      <ul className="list">
        {ads.map((ad) => (
          <li key={ad._id} className="list-item">
            <div>
              <strong>{ad.title}</strong>
              {ad.price != null && <span className="muted"> {ad.price} BYN</span>}
            </div>
            <div className="actions">
              <button onClick={() => updateStatus(ad._id, "active")}>Активировать</button>
              <button onClick={() => updateStatus(ad._id, "blocked")} className="secondary">
                Заблокировать
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminUsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");

  const loadUsers = async () => {
    const params: Record<string, string> = {};
    if (role) params.role = role;
    if (query) params.q = query;
    const { data } = await api.get("/admin/users", { params });
    setUsers(Array.isArray(data) ? data : data.items ?? []);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const updateRole = async (userId: string, nextRole: string) => {
    await api.patch(`/admin/users/${userId}/role`, { role: nextRole });
    await loadUsers();
  };

  const toggleBlock = async (userId: string, block = true) => {
    await api.patch(`/admin/users/${userId}/block`, { blocked: block });
    await loadUsers();
  };

  return (
    <div className="card">
      <h3>Пользователи</h3>
      <div className="filters">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск" />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Все роли</option>
          <option value="user">Пользователи</option>
          <option value="admin">Администраторы</option>
        </select>
        <button onClick={loadUsers}>Применить</button>
      </div>
      <ul className="list">
        {users.map((user) => (
          <li key={user._id} className="list-item">
            <div>
              <strong>{user.name || user.username || user.phone}</strong>
              <span className="muted">Роль: {user.role}</span>
            </div>
            <div className="actions">
              <button onClick={() => updateRole(user._id, user.role === "admin" ? "user" : "admin")}>
                Сделать {user.role === "admin" ? "пользователем" : "админом"}
              </button>
              <button onClick={() => toggleBlock(user._id, !user.blocked)} className="secondary">
                {user.blocked ? "Разблокировать" : "Заблокировать"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPage() {
  const { token, currentUser } = useAuth();
  const [tab, setTab] = useState<"ads" | "users">("ads");

  if (!token) {
    return (
      <div className="page">
        <p>Войдите как администратор.</p>
        <Link to="/login">Авторизация</Link>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="page">
        <p>Доступ запрещен.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Админка</h1>
      <div className="tabs">
        <button className={tab === "ads" ? "active" : ""} onClick={() => setTab("ads")}>
          Объявления
        </button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
          Пользователи
        </button>
      </div>
      {tab === "ads" && <AdminAdsTab />}
      {tab === "users" && <AdminUsersTab />}
    </div>
  );
}
