import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

interface HealthResponse {
  status?: string;
  endpoints?: string[] | Record<string, string>;
  message?: string;
  [key: string]: unknown;
}

type HealthState = 'idle' | 'loading' | 'success' | 'error';

const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

function getEndpointsList(endpoints?: string[] | Record<string, string>) {
  if (!endpoints) return [] as string[];
  if (Array.isArray(endpoints)) return endpoints;
  return Object.entries(endpoints).map(([key, value]) => `${key}: ${value}`);
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [state, setState] = useState<HealthState>('idle');
  const [error, setError] = useState<string | null>(null);

  const endpointsList = useMemo(() => getEndpointsList(health?.endpoints), [health]);

  const handleCheck = async () => {
    setState('loading');
    setError(null);
    try {
      const response = await axios.get(`${apiBase}/health`);
      setHealth(response.data);
      setState('success');
    } catch (err) {
      setHealth(null);
      setState('error');
      setError(err instanceof Error ? err.message : 'Не удалось выполнить запрос');
    }
  };

  useEffect(() => {
    handleCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = health?.status || (state === 'error' ? 'DOWN' : '—');
  const isUp = statusLabel?.toUpperCase() === 'UP';

  return (
    <div className="page-grid">
      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Панель инструментов</p>
            <h2 className="card__title">Проверка здоровья API</h2>
            <p className="muted">Запрос отправляется на {apiBase || 'текущий домен'}.</p>
          </div>
          <button type="button" className="primary" onClick={handleCheck} disabled={state === 'loading'}>
            {state === 'loading' ? 'Проверяем…' : 'Проверка здоровья'}
          </button>
        </div>

        <div className="status-block">
          <span className={`status-pill ${isUp ? 'status-pill--success' : 'status-pill--danger'}`}>
            {state === 'loading' ? 'Проверяем…' : isUp ? 'UP' : 'DOWN'}
          </span>
          <div className="status-text">
            <p className="status-text__title">Ответ сервера</p>
            <p className="status-text__body">{health?.message || health?.status || 'Ожидание ответа...'}</p>
          </div>
        </div>

        {state === 'loading' && <p className="muted">Идёт загрузка данных о состоянии сервиса…</p>}

        {state === 'error' && (
          <div className="error-box">
            <p className="error-box__title">Не удалось получить статус</p>
            <p className="error-box__body">{error || 'Попробуйте повторить запрос позже.'}</p>
          </div>
        )}

        {state === 'success' && (
          <div className="grid">
            <div className="card card--sub">
              <p className="eyebrow">Эндпоинты</p>
              {endpointsList.length > 0 ? (
                <ul className="list">
                  {endpointsList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Список эндпоинтов не получен.</p>
              )}
            </div>
            <div className="card card--sub">
              <p className="eyebrow">Сырый ответ</p>
              <pre className="code-block">{JSON.stringify(health, null, 2)}</pre>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
