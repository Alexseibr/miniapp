import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { AdPreview } from '@/types';
import FavoriteButton from '@/components/FavoriteButton';

interface FarmerProductCardProps {
  ad: AdPreview & {
    unitType?: string;
    quantity?: number;
    freshAt?: string;
    harvestDate?: string;
    productionDate?: string;
    isOrganic?: boolean;
    minQuantity?: number;
    isSeasonal?: boolean;
    isFarmerAd?: boolean;
    pricePerKg?: number;
    categoryName?: string;
  };
  compact?: boolean;
}

const UNIT_LABELS: Record<string, string> = {
  kg: 'кг',
  g: 'г',
  piece: 'шт',
  liter: 'л',
  pack: 'уп',
  jar: 'банка',
  bunch: 'пучок',
  bag: 'мешок',
};

const CATEGORY_ICONS: Record<string, string> = {
  vegetables: '🥬',
  fruits: '🍎',
  berries: '🍓',
  greens: '🌿',
  potato: '🥔',
  canning: '🥫',
  honey: '🍯',
  dairy: '🥛',
  meat: '🥩',
  plants: '🌱',
  feed: '🌾',
};

function formatDistance(distanceKm?: number): string {
  if (distanceKm == null || isNaN(distanceKm)) return '';
  if (distanceKm < 0.1) return '< 100 м';
  if (distanceKm < 1) return `${Math.round(distanceKm * 100) * 10} м`;
  return `${distanceKm.toFixed(1)} км`;
}

function formatFreshness(
  freshAt?: string, 
  harvestDate?: string, 
  productionDate?: string,
  isProduction?: boolean
): { label: string; icon: string; color: string } | null {
  const dateStr = freshAt || harvestDate || productionDate;
  if (!dateStr) return null;
  
  const freshDate = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const freshDay = new Date(freshDate.getFullYear(), freshDate.getMonth(), freshDate.getDate());
  
  const diffDays = Math.floor((today.getTime() - freshDay.getTime()) / (1000 * 60 * 60 * 24));
  const verb = productionDate || isProduction ? 'Испечено' : 'Собрано';
  
  if (diffDays === 0) {
    return { label: `${verb} сегодня`, icon: '🌿', color: '#059669' };
  } else if (diffDays === 1) {
    return { label: `${verb} вчера`, icon: '🥬', color: '#059669' };
  } else if (diffDays <= 3) {
    return { label: `${verb} ${diffDays} дня назад`, icon: '📦', color: '#D97706' };
  } else {
    return { 
      label: `${verb}: ${freshDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`, 
      icon: '📅',
      color: '#6B7280'
    };
  }
}

function formatPriceHint(price: number, unitType?: string): string | null {
  if (!unitType) return null;
  
  switch (unitType) {
    case 'kg':
      return `${(price / 10).toFixed(2)} руб. за 100 г`;
    case 'liter':
      return `${(price / 10).toFixed(2)} руб. за 100 мл`;
    default:
      return null;
  }
}

function getCategoryIcon(categorySlug?: string): string {
  if (!categorySlug) return '🛒';
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (categorySlug.toLowerCase().includes(key)) {
      return icon;
    }
  }
  return '🌾';
}

export default function FarmerProductCard({ ad, compact = false }: FarmerProductCardProps) {
  const navigate = useNavigate();
  
  const unitLabel = ad.unitType ? UNIT_LABELS[ad.unitType] || ad.unitType : '';
  const priceLabel = `${ad.price.toLocaleString('ru-RU')} руб.${unitLabel ? ` / ${unitLabel}` : ''}`;
  const priceHint = formatPriceHint(ad.price, ad.unitType);
  const freshness = formatFreshness(ad.freshAt, ad.harvestDate, ad.productionDate);
  const distance = formatDistance(ad.distanceKm);
  const categoryIcon = getCategoryIcon(ad.categoryName || ad.subcategoryId);
  const isOrganic = ad.isOrganic;

  const handleClick = () => {
    navigate(`/ads/${ad._id}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: '#FFFFFF',
        borderRadius: compact ? 14 : 18,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid={`farmer-card-${ad._id}`}
    >
      {/* Image */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: compact ? '1/1' : '4/3',
        background: '#F3F4F6',
        overflow: 'hidden',
      }}>
        {ad.photos && ad.photos.length > 0 ? (
          <img
            src={ad.photos[0]}
            alt={ad.title}
            loading="lazy"
            decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: compact ? 40 : 56,
            background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
          }}>
            {categoryIcon}
          </div>
        )}

        {/* Category Badge - top left */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          padding: compact ? '4px 8px' : '6px 10px',
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
        }}>
          <span>{categoryIcon}</span>
          {!compact && ad.categoryName && (
            <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ad.categoryName}
            </span>
          )}
        </div>

        {/* Distance Badge - top right */}
        {distance && (
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(59, 115, 252, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: 10,
            padding: compact ? '4px 8px' : '6px 10px',
            fontSize: compact ? 11 : 12,
            fontWeight: 600,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 2px 6px rgba(59, 115, 252, 0.3)',
          }}>
            <MapPin size={compact ? 12 : 14} />
            {distance}
          </div>
        )}

        {/* Organic/Seasonal Badges - bottom left */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          display: 'flex',
          gap: 6,
        }}>
          {isOrganic && (
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              borderRadius: 10,
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)',
              letterSpacing: '0.3px',
            }}>
              Натуральный
            </div>
          )}
          {ad.isSeasonal && (
            <div style={{
              background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
              borderRadius: 10,
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(59, 115, 252, 0.4)',
              letterSpacing: '0.3px',
            }}>
              Сезон!
            </div>
          )}
        </div>

        {/* Favorite Button - bottom right */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
        }}
          onClick={(e) => e.stopPropagation()}
        >
          <FavoriteButton adId={ad._id} size={18} />
        </div>
      </div>

      {/* Info */}
      <div style={{
        padding: compact ? 12 : 16,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 6 : 10,
        flex: 1,
      }}>
        {/* Title */}
        <h3 style={{
          margin: 0,
          fontSize: compact ? 14 : 16,
          fontWeight: 600,
          color: '#111827',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {ad.title}
        </h3>

        {/* Price */}
        <div>
          <div style={{
            fontSize: compact ? 16 : 20,
            fontWeight: 700,
            color: '#111827',
            letterSpacing: '-0.3px',
          }}>
            {priceLabel}
          </div>
          {priceHint && (
            <div style={{
              fontSize: compact ? 11 : 12,
              color: '#6B7280',
              marginTop: 2,
            }}>
              {priceHint}
            </div>
          )}
        </div>

        {/* Freshness */}
        {freshness && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: compact ? 12 : 13,
            color: freshness.color,
            fontWeight: 500,
            background: freshness.color === '#059669' ? '#ECFDF5' : 
                       freshness.color === '#D97706' ? '#FFFBEB' : '#F3F4F6',
            padding: '6px 10px',
            borderRadius: 8,
            marginTop: 'auto',
          }}>
            <span>{freshness.icon}</span>
            <span>{freshness.label}</span>
          </div>
        )}

        {/* City */}
        {!freshness && ad.city && (
          <div style={{
            fontSize: compact ? 12 : 13,
            color: '#6B7280',
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <MapPin size={13} />
            {ad.city}
          </div>
        )}
      </div>
    </div>
  );
}
