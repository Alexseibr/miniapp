import { Link } from 'react-router-dom';

interface Props {
  ad: any;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: boolean;
  onSelect?: (ad: any) => void;
}

const AdCard = ({ ad, onToggleFavorite, isFavorite, onSelect }: Props) => (
  <div
    className="card"
    style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: onSelect ? 'pointer' : undefined }}
    onClick={() => onSelect?.(ad)}
  >
    <div style={{ position: 'relative' }}>
      <img
        src={ad.photos?.[0] || 'https://placehold.co/400x240?text=Photo'}
        alt={ad.title}
        style={{ width: '100%', borderRadius: 12, objectFit: 'cover' }}
      />
      {onToggleFavorite && (
        <button
          className="button"
          style={{ position: 'absolute', top: 8, right: 8 }}
          onClick={() => onToggleFavorite(ad._id || ad.id)}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      )}
    </div>
    <Link to={`/ad/${ad._id || ad.id}`} style={{ fontWeight: 700 }}>
      {ad.title}
    </Link>
    <div style={{ color: '#1f2937', fontSize: 14 }}>{ad.description}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <strong>{ad.price} ₽</strong>
      {ad.seasonCode && <span style={{ fontSize: 12, color: '#6b7280' }}>{ad.seasonCode}</span>}
    </div>
  </div>
);

export default AdCard;
