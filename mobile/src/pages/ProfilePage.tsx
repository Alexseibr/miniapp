import { useEffect, useState } from 'react';
import { userApi } from '../api/userApi';
import { useAuth } from '../auth/useAuth';
import { LoaderScreen } from '../components/LoaderScreen';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    const load = async () => {
      if (user) return;
      try {
        const { data } = await userApi.getMe();
        const token = localStorage.getItem('kufar-mobile:token');
        if (token) login(token, data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [login, user]);

  if (loading || !user) return <LoaderScreen message="Загружаем профиль" />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Пользователь</div>
          <div className="text-xl font-semibold">{user.name}</div>
          {user.username && <div className="text-sm text-gray-600">@{user.username}</div>}
          {user.phone && <div className="text-sm text-gray-600">{user.phone}</div>}
        </div>
        <Link to="/profile/edit" className="text-primary text-sm font-semibold">
          Редактировать
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Город</span>
          <span className="font-medium">{user.cityCode || 'не выбран'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Роль</span>
          <span className="font-medium">{user.role}</span>
        </div>
      </div>
    </div>
  );
}
