import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/auth";

type AdminUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  telegramUsername?: string;
  phone?: string;
  email?: string;
  role: string;
  isBlocked?: boolean;
  createdAt?: string;
};

type Filters = {
  q: string;
  role: string;
  blocked: string;
};

const defaultFilters: Filters = {
  q: "",
  role: "",
  blocked: "",
};

export default function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.role) params.set("role", filters.role);
    if (filters.blocked === "blocked") params.set("isBlocked", "true");
    if (filters.blocked === "unblocked") params.set("isBlocked", "false");
    return params.toString();
  }, [filters]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(queryString ? `/api/admin/users?${queryString}` : "/api/admin/users");
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError((err as Error).message || "Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (userId: string, role: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updated = await response.json();
      setUsers((prev) => prev.map((user) => (user._id === userId ? { ...user, role: updated.role } : user)));
    } catch (err) {
      setError((err as Error).message || "Не удалось обновить роль пользователя");
    }
  };

  const updateBlockStatus = async (userId: string, isBlocked: boolean) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/${userId}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updated = await response.json();
      setUsers((prev) => prev.map((user) => (user._id === userId ? { ...user, isBlocked: updated.isBlocked } : user)));
    } catch (err) {
      setError((err as Error).message || "Не удалось обновить блокировку пользователя");
    }
  };

  const onChangeFilters = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-end">
        <label className="flex flex-col text-sm">
          Поиск
          <input
            className="border rounded px-2 py-1"
            placeholder="Имя, телефон или email"
            value={filters.q}
            onChange={(e) => onChangeFilters("q", e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm">
          Роль
          <select
            className="border rounded px-2 py-1"
            value={filters.role}
            onChange={(e) => onChangeFilters("role", e.target.value)}
          >
            <option value="">Все</option>
            <option value="user">Пользователь</option>
            <option value="admin">Администратор</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Блокировка
          <select
            className="border rounded px-2 py-1"
            value={filters.blocked}
            onChange={(e) => onChangeFilters("blocked", e.target.value)}
          >
            <option value="">Все</option>
            <option value="blocked">Заблокированные</option>
            <option value="unblocked">Активные</option>
          </select>
        </label>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          type="button"
          onClick={fetchUsers}
          disabled={loading}
        >
          Применить
        </button>
      </div>

      {loading && <div>Загрузка...</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">Имя</th>
              <th className="border px-3 py-2 text-left">Телефон</th>
              <th className="border px-3 py-2 text-left">Email</th>
              <th className="border px-3 py-2 text-left">Username (TG)</th>
              <th className="border px-3 py-2 text-left">Роль</th>
              <th className="border px-3 py-2 text-left">Заблокирован</th>
              <th className="border px-3 py-2 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="odd:bg-white even:bg-gray-50">
                <td className="border px-3 py-2">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "—"}
                </td>
                <td className="border px-3 py-2">{user.phone || "—"}</td>
                <td className="border px-3 py-2">{user.email || "—"}</td>
                <td className="border px-3 py-2">{user.telegramUsername || user.username || "—"}</td>
                <td className="border px-3 py-2">{user.role}</td>
                <td className="border px-3 py-2">{user.isBlocked ? "Да" : "Нет"}</td>
                <td className="border px-3 py-2 space-x-2">
                  <button
                    className="px-2 py-1 bg-purple-600 text-white rounded"
                    type="button"
                    onClick={() => updateRole(user._id, user.role === "admin" ? "user" : "admin")}
                  >
                    {user.role === "admin" ? "Убрать админа" : "Сделать админом"}
                  </button>
                  <button
                    className="px-2 py-1 bg-red-600 text-white rounded"
                    type="button"
                    onClick={() => updateBlockStatus(user._id, !user.isBlocked)}
                  >
                    {user.isBlocked ? "Разблокировать" : "Заблокировать"}
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && !loading && (
              <tr>
                <td className="border px-3 py-2 text-center" colSpan={7}>
                  Пользователи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
