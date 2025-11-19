import { useState } from 'react';
import { useCartStore } from '@/store/cart';
import { useUserStore } from '@/store/useUserStore';
import { mapCartToPayload, submitOrder } from '@/api/orders';

export default function CartPanel() {
  const { items, removeItem, updateQuantity, clear, total } = useCartStore();
  const user = useUserStore((state) => state.user);
  const [comment, setComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!items.length) {
    return null;
  }

  const handleSubmit = async () => {
    if (!user?.telegramId) {
      alert('Для оформления заказа авторизуйтесь через Telegram.');
      return;
    }
    try {
      setPending(true);
      await submitOrder({
        buyerTelegramId: user.telegramId,
        comment,
        items: mapCartToPayload(items),
      });
      clear();
      setComment('');
      setIsOpen(false);
      alert('Заказ отправлен продавцам!');
    } catch (error) {
      console.error('submit order', error);
      alert('Не удалось создать заказ. Попробуйте ещё раз.');
    } finally {
      setPending(false);
    }
  };

  return (
    <aside
      className="card"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        maxWidth: 360,
        width: 'calc(100% - 32px)',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Корзина · {items.length} позиций</strong>
        <button type="button" onClick={() => setIsOpen((prev) => !prev)} style={{ border: 'none', background: 'transparent' }}>
          {isOpen ? 'Свернуть' : 'Развернуть'}
        </button>
      </div>
      {isOpen && (
        <div style={{ marginTop: 12 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 200, overflow: 'auto' }}>
            {items.map((item) => (
              <li key={item.adId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0 }}>{item.title}</p>
                  <small style={{ color: '#475467' }}>
                    {item.price.toLocaleString('ru-RU')} BYN · количество:
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.adId, Number(event.target.value))}
                      style={{ width: 60, marginLeft: 8 }}
                    />
                  </small>
                </div>
                <button type="button" onClick={() => removeItem(item.adId)} style={{ border: 'none', background: 'transparent' }}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <textarea
            placeholder="Комментарий к заказу"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            style={{ width: '100%', marginTop: 12, borderRadius: 12, border: '1px solid #d0d5dd', padding: 12 }}
          />
          <p style={{ margin: '12px 0 8px', fontWeight: 600 }}>Сумма: {total().toFixed(2)} BYN</p>
          <button type="button" className="primary" onClick={handleSubmit} disabled={pending}>
            {pending ? 'Отправляем…' : 'Отправить продавцам'}
          </button>
        </div>
      )}
    </aside>
  );
}
