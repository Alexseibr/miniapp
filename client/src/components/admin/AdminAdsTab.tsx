import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/auth";

type AdminAdOwner = {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  telegramId?: string;
};

type AdminAd = {
  _id: string;
  title: string;
  price?: number;
  status: string;
  createdAt: string;
  owner?: AdminAdOwner;
  userTelegramId?: string;
};

type Filters = {
  status: string;
  q: string;
  ownerPhone: string;
};

const defaultFilters: Filters = {
  status: "",
  q: "",
  ownerPhone: "",
};

const statusLabels: Record<string, string> = {
  pending: "На модерации",
  active: "Активно",
  blocked: "Заблокировано",
};

function getOwnerDisplay(owner?: AdminAdOwner) {
  if (!owner) return "-";

  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(" ");
  if (fullName) return `${fullName}${owner.phone ? ` (${owner.phone})` : ""}`;
  if (owner.username) return owner.username;
  if (owner.telegramId) return `TG: ${owner.telegramId}`;
  return owner.phone || "-";
}

export default function AdminAdsTab() {
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    if (filters.ownerPhone) params.set("ownerPhone", filters.ownerPhone);
    return params.toString();
  }, [filters]);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(queryString ? `/api/admin/ads?${queryString}` : "/api/admin/ads");
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setAds(data);
    } catch (err) {
      setError((err as Error).message || "Не удалось загрузить объявления");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const updateStatus = async (adId: string, status: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/ads/${adId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updated = await response.json();
      setAds((prev) => prev.map((ad) => (ad._id === adId ? { ...ad, status: updated.status } : ad)));
    } catch (err) {
      setError((err as Error).message || "Не удалось обновить статус объявления");
    }
  };

  const onChangeFilters = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-end">
        <label className="flex flex-col text-sm">
          Статус
          <select
            className="border rounded px-2 py-1"
            value={filters.status}
            onChange={(e) => onChangeFilters("status", e.target.value)}
          >
            <option value="">Все</option>
            <option value="pending">На модерации</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Поиск
          <input
            className="border rounded px-2 py-1"
            placeholder="Заголовок или описание"
            value={filters.q}
            onChange={(e) => onChangeFilters("q", e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm">
          Телефон владельца
          <input
            className="border rounded px-2 py-1"
            placeholder="+375..."
            value={filters.ownerPhone}
            onChange={(e) => onChangeFilters("ownerPhone", e.target.value)}
          />
        </label>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          type="button"
          onClick={fetchAds}
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
              <th className="border px-3 py-2 text-left">Заголовок</th>
              <th className="border px-3 py-2 text-left">Цена</th>
              <th className="border px-3 py-2 text-left">Статус</th>
              <th className="border px-3 py-2 text-left">Владелец</th>
              <th className="border px-3 py-2 text-left">Дата создания</th>
              <th className="border px-3 py-2 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr key={ad._id} className="odd:bg-white even:bg-gray-50">
                <td className="border px-3 py-2">{ad.title}</td>
                <td className="border px-3 py-2">{ad.price ?? "—"}</td>
                <td className="border px-3 py-2">{statusLabels[ad.status] || ad.status}</td>
                <td className="border px-3 py-2">{getOwnerDisplay(ad.owner)}</td>
                <td className="border px-3 py-2">{new Date(ad.createdAt).toLocaleString()}</td>
                <td className="border px-3 py-2 space-x-2">
                  <button
                    className="px-2 py-1 bg-green-600 text-white rounded"
                    type="button"
                    onClick={() => updateStatus(ad._id, "active")}
                  >
                    Активировать
                  </button>
                  <button
                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                    type="button"
                    onClick={() => updateStatus(ad._id, "pending")}
                  >
                    На модерацию
                  </button>
                  <button
                    className="px-2 py-1 bg-red-600 text-white rounded"
                    type="button"
                    onClick={() => updateStatus(ad._id, "blocked")}
                  >
                    Заблокировать
                  </button>
                </td>
              </tr>
            ))}
            {!ads.length && !loading && (
              <tr>
                <td className="border px-3 py-2 text-center" colSpan={6}>
                  Объявлений не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
