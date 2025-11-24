import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { cityApi, City } from '../api/cityApi';

export default function SettingsPage() {
  const { logout, user } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [selected, setSelected] = useState(user?.cityCode || '');
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const { data } = await cityApi.getCities();
        setCities(data);
      } catch (err) {
        setCities([{ code: 'global', name: 'Вся Беларусь' }]);
      }
    };
    loadCities();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Настройки</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <div className="text-sm font-semibold">Город</div>
        <select
          className="w-full border rounded-lg px-3 py-3"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {cities.map((city) => (
            <option key={city.code} value={city.code}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Уведомления</div>
            <div className="text-xs text-gray-500">Включить push (скоро)</div>
          </div>
          <input
            type="checkbox"
            checked={notifications}
            onChange={() => setNotifications((prev) => !prev)}
            className="w-5 h-5"
          />
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full border border-red-500 text-red-600 rounded-lg py-3 font-semibold"
      >
        Выйти
      </button>
    </div>
  );
}
