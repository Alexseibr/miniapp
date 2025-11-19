import { Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import { AdPreview } from '@/types';
import { formatDistance } from '@/utils/geo';
import { useCartStore } from '@/store/cart';

interface Props {
  ad: AdPreview;
}

export default function AdCard({ ad }: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const handleAddToCart = () => {
    addItem({
      adId: ad._id,
      title: ad.title,
      price: ad.price,
      quantity: 1,
      sellerTelegramId: ad.sellerTelegramId,
      photo: ad.photos?.[0],
    });
  };

  return (
    <article className="card" style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to={`/ads/${ad._id}`} style={{ fontWeight: 600 }}>
            {ad.title}
          </Link>
          <FavoriteButton adId={ad._id} />
        </div>
        <p style={{ margin: '8px 0', color: '#475467' }}>{ad.description || 'Описание появится позже'}</p>
        <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 600 }}>
          {ad.price.toLocaleString('ru-RU')} {ad.currency || 'BYN'}
        </p>
        {ad.distanceKm != null && (
          <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#64748b' }}>
            {formatDistance(ad.distanceKm)} от вас
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" className="secondary" onClick={handleAddToCart}>
            Добавить в корзину
          </button>
          <a
            className="secondary"
            href={`tg://user?id=${ad.sellerTelegramId}`}
            style={{ textAlign: 'center', textDecoration: 'none', lineHeight: '42px' }}
          >
            Написать продавцу
          </a>
        </div>
      </div>
    </article>
  );
}
