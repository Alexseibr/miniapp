import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminAdsTab from "@/components/admin/AdminAdsTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import Loader from "@/components/Loader";
import { useAuth } from "@/features/auth/AuthContext";

const tabs = [
  { key: "ads", label: "Объявления" },
  { key: "users", label: "Пользователи" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function AdminPage() {
  const { currentUser, token, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("ads");
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      setAccessMessage("Доступ запрещен");
    } else {
      setAccessMessage(null);
    }
  }, [currentUser]);

  if (!token) {
    return (
      <div className="p-4 space-y-2">
        <p>Войдите как администратор, чтобы просматривать эту страницу.</p>
        <Link className="text-blue-600 underline" to="/login">
          Перейти к входу
        </Link>
      </div>
    );
  }

  if (isLoading || !currentUser) {
    return (
      <div className="p-4">
        <Loader />
      </div>
    );
  }

  if (accessMessage) {
    return <div className="p-4 text-red-600">{accessMessage}</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Админ-панель</h1>
      </div>
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
