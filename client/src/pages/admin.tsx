import { useEffect, useState } from "react";
import AdminAdsTab from "@/components/admin/AdminAdsTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import { fetchWithAuth } from "@/lib/auth";

const tabs = [
  { key: "ads", label: "Объявления" },
  { key: "users", label: "Пользователи" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

type CurrentUser = {
  role?: string;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("ads");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const response = await fetchWithAuth("/api/users/me");
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        setCurrentUser(data);
        if (data.role !== "admin") {
          setError("Доступ запрещен: требуется роль администратора");
        }
      } catch (err) {
        setError((err as Error).message || "Не удалось проверить доступ");
      } finally {
        setLoading(false);
      }
    };

    loadMe();
  }, []);

  if (loading) {
    return <div className="p-4">Проверка доступа...</div>;
  }

  if (error || currentUser?.role !== "admin") {
    return <div className="p-4 text-red-600">{error || "Доступ запрещен"}</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`px-4 py-2 rounded ${activeTab === tab.key ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ads" && <AdminAdsTab />}
      {activeTab === "users" && <AdminUsersTab />}
    </div>
  );
}
