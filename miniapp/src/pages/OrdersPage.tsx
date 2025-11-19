import { useEffect, useMemo, useState } from 'react';
import EmptyState from '@/widgets/EmptyState';
import { fetchOrders } from '@/api/orders';
import { useUserStore } from '@/store/useUserStore';
import { OrderSummary } from '@/types';
import { formatDistanceToNow } from '@/utils/time';

const fallbackOrders: OrderSummary[] = [
  {
    _id: 'demo-order-1',
    status: 'new',
    seasonCode: 'demo',
    createdAt: new Date().toISOString(),
    items: [
      { adId: 'demo-1', title: 'Тестовая корзина', price: 12, quantity: 2 },
      { adId: 'demo-2', title: 'Демо ягоды', price: 8, quantity: 1 },
    ],
  },
];

function getStatusLabel(status: string) {
  switch (status) {
    case 'new':
      return 'Новый';
    case 'processed':
      return 'В работе';
    case 'completed':
      return 'Завершён';
    case 'cancelled':
      return 'Отменён';
    case 'expired':
      return 'Истёк';
    default:
      return status;
  }
}

function calcTotal(order: OrderSummary) {
  return order.items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
}

export default function OrdersPage() {
  const user = useUserStore((state) => state.user);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user?.telegramId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetchOrders(user.telegramId);
        setOrders(response.items || []);
      } catch (err) {
        console.error('orders fetch error', err);
        setError('Не удалось загрузить заказы');
        setOrders(fallbackOrders);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.telegramId]);

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  if (!user) {
    return (
      <EmptyState
        title="Войдите через Telegram"
        description="Откройте MiniApp из чата с ботом, чтобы увидеть свои заказы"
      />
    );
  }

  if (loading) {
    return <EmptyState title="Загружаем ваши заказы" />;
  }

  if (!hasOrders) {
    return <EmptyState title="У вас пока нет заказов" description="Оформите заказ из карточки объявления" />;
  }

  return (
    <div className="container">
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Мои заказы</h2>
      {error && (
        <div
          role="status"
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            background: '#fff7ed',
            color: '#9a3412',
          }}
        >
          {error} (показаны демо-данные)
        </div>
      )}
      <div className="stack" style={{ gap: 12 }}>
        {orders.map((order) => {
          const total = calcTotal(order);
          const createdLabel = order.createdAt ? formatDistanceToNow(order.createdAt) : '';
          return (
            <article key={order._id} className="card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="badge" style={{ marginBottom: 6 }}>#{order._id}</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>{getStatusLabel(order.status)}</p>
                  {createdLabel && (
                    <p style={{ margin: '4px 0', color: '#475467', fontSize: '0.9rem' }}>Создан {createdLabel}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, color: '#111827', fontWeight: 700 }}>{total.toFixed(2)} BYN</p>
                  <p style={{ margin: 0, color: '#475467', fontSize: '0.9rem' }}>
                    {order.items.length} поз.
                  </p>
                </div>
              </div>
              {order.seasonCode && (
                <p style={{ margin: '6px 0 12px', color: '#475467', fontSize: '0.9rem' }}>
                  Сезон: {order.seasonCode}
                </p>
              )}
              <ul style={{ paddingLeft: 18, margin: 0, color: '#111827' }}>
                {order.items.map((item) => (
                  <li key={`${order._id}-${item.adId}`} style={{ marginBottom: 4 }}>
                    <span>{item.title || 'Объявление'}</span>
                    {typeof item.quantity === 'number' && (
                      <span style={{ color: '#475467' }}> — {item.quantity} шт.</span>
                    )}
                    {typeof item.price === 'number' && (
                      <span style={{ marginLeft: 6, color: '#111827', fontWeight: 600 }}>
                        {(item.price * (item.quantity || 1)).toFixed(2)} BYN
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
