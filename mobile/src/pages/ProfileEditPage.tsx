import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/userApi';
import { useAuth } from '../auth/useAuth';

export default function ProfileEditPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [cityCode, setCityCode] = useState(user?.cityCode || '');
  const [contact, setContact] = useState(user?.phone || user?.username || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await userApi.updateMe({ name, cityCode, phone: contact });
      const token = localStorage.getItem('kufar-mobile:token');
      if (token) login(token, data);
      navigate('/profile');
    } catch (err) {
      setError('Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Редактирование профиля</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm text-gray-600">Имя</span>
          <input
            className="w-full border rounded-lg px-3 py-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-gray-600">Город по умолчанию</span>
          <input
            className="w-full border rounded-lg px-3 py-3"
            value={cityCode}
            onChange={(e) => setCityCode(e.target.value)}
            placeholder="minsk"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-gray-600">Способ связи</span>
          <input
            className="w-full border rounded-lg px-3 py-3"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Телефон или @username"
          />
        </label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          type="submit"
          className="w-full bg-primary text-white rounded-lg py-3 font-semibold disabled:opacity-60"
          disabled={saving}
        >
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
