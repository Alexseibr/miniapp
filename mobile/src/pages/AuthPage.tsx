import { FormEvent, useState } from 'react';
import { authApi } from '../api/authApi';
import { useAuth } from '../auth/useAuth';

export default function AuthPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.requestPhoneCode(phone);
      setStage('code');
    } catch (err) {
      setError('Не удалось отправить код.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.verifyPhoneCode(phone, code);
      login(data.accessToken, data.user);
    } catch (err) {
      setError('Код не подошёл.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Вход</h1>
        <p className="text-gray-600 text-sm">Выберите удобный способ авторизации.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Телефон</h2>
          <span className="text-xs text-gray-500">SMS-код</span>
        </div>
        <form onSubmit={stage === 'phone' ? handleRequest : handleVerify} className="space-y-3">
          <input
            type="tel"
            placeholder="Номер телефона"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border px-3 py-3 text-base"
            required
          />
          {stage === 'code' && (
            <input
              type="text"
              placeholder="Код из SMS"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border px-3 py-3 text-base tracking-widest"
              required
            />
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            className="w-full bg-primary text-white rounded-lg py-3 text-base font-semibold disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Отправка...' : stage === 'phone' ? 'Получить код' : 'Войти'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="text-lg font-semibold">Telegram</h2>
        <p className="text-sm text-gray-600">
          Войти через виджет Telegram или одноразовую ссылку из бота.
        </p>
        <div className="flex gap-2">
          <a
            className="flex-1 text-center border rounded-lg py-2 text-sm font-semibold"
            href="https://t.me"
            target="_blank"
            rel="noreferrer"
          >
            Виджет
          </a>
          <a
            className="flex-1 text-center border rounded-lg py-2 text-sm font-semibold"
            href="https://t.me"
            target="_blank"
            rel="noreferrer"
          >
            Бот-ссылка
          </a>
        </div>
      </div>
    </div>
  );
}
