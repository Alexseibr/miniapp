import { Star, Zap, Crown, Eye, MessageCircle, Heart } from 'lucide-react';
import { getThumbnailUrl } from '@/constants/placeholders';

interface Ad {
  _id: string;
  title: string;
  price: number;
  unitType?: string;
  photos?: string[];
  isPremiumCard?: boolean;
  premiumBadge?: string;
  boostLevel?: number;
  views?: number;
  contactClicks?: number;
  favorites?: number;
  categoryName?: string;
}

interface FarmerPremiumCardProps {
  ad: Ad;
  onClick?: () => void;
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

const BADGE_STYLES: Record<string, { bg: string; icon: any; text: string }> = {
  top_seller: {
    bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    icon: Crown,
    text: 'Топ-продавец',
  },
  eco: {
    bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    icon: Star,
    text: 'Эко-продукт',
  },
  premium: {
    bg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    icon: Zap,
    text: 'Премиум',
  },
  fresh: {
    bg: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
    icon: Star,
    text: 'Свежее',
  },
};

const BOOST_BORDERS: Record<number, string> = {
  1: '2px solid #F59E0B',
  2: '3px solid linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
  3: '4px solid #8B5CF6',
};

export default function FarmerPremiumCard({ ad, onClick }: FarmerPremiumCardProps) {
  const isPremium = ad.isPremiumCard;
  const boostLevel = ad.boostLevel || 0;
  const badge = ad.premiumBadge ? BADGE_STYLES[ad.premiumBadge] : null;

  const getBorderStyle = () => {
    if (boostLevel >= 3) {
      return {
        border: 'none',
        background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 50%, #EC4899 100%)',
        padding: 3,
      };
    }
    if (boostLevel === 2) {
      return {
        border: 'none',
        background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
        padding: 2,
      };
    }
    if (boostLevel === 1 || isPremium) {
      return {
        border: '2px solid #F59E0B',
        background: 'transparent',
        padding: 0,
      };
    }
    return {
      border: '1px solid #E5E7EB',
      background: 'transparent',
      padding: 0,
    };
  };

  const borderStyle = getBorderStyle();
  const hasGradientBorder = boostLevel >= 2;

  const photoUrl = ad.photos?.[0] 
    ? getThumbnailUrl(ad.photos[0])
    : '/placeholder-product.jpg';

  return (
    <div
      onClick={onClick}
      style={{
        ...borderStyle,
        borderRadius: 16,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
      }}
      data-testid={`premium-card-${ad._id}`}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: hasGradientBorder ? 13 : 15,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={photoUrl}
            alt={ad.title}
            style={{
              width: '100%',
              height: 140,
              objectFit: 'cover',
            }}
            loading="lazy"
          />
          
          {badge && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: badge.bg,
                borderRadius: 8,
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <badge.icon size={12} />
              {badge.text}
            </div>
          )}

          {boostLevel >= 2 && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: boostLevel >= 3 
                  ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
                  : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                borderRadius: 20,
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              <Zap size={10} />
              x{boostLevel}
            </div>
          )}
        </div>

        <div style={{ padding: 12 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#111827',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {ad.title}
          </div>

          <div style={{
            fontSize: 17,
            fontWeight: 700,
            color: isPremium || boostLevel > 0 ? '#8B5CF6' : '#059669',
            marginBottom: 8,
          }}>
            {ad.price} руб.
            {ad.unitType && (
              <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>
                /{UNIT_LABELS[ad.unitType] || ad.unitType}
              </span>
            )}
          </div>

          {ad.categoryName && (
            <div style={{
              fontSize: 11,
              color: '#6B7280',
              marginBottom: 8,
            }}>
              {ad.categoryName}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: 12,
            fontSize: 11,
            color: '#9CA3AF',
          }}>
            {ad.views !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Eye size={12} />
                {ad.views}
              </div>
            )}
            {ad.contactClicks !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <MessageCircle size={12} />
                {ad.contactClicks}
              </div>
            )}
            {ad.favorites !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Heart size={12} />
                {ad.favorites}
              </div>
            )}
          </div>
        </div>
      </div>

      {(isPremium || boostLevel >= 2) && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: boostLevel >= 3 
              ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
              : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            borderRadius: 12,
            padding: '3px 10px',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          {boostLevel >= 3 ? 'MAX' : boostLevel === 2 ? 'PRO' : 'PREMIUM'}
        </div>
      )}
    </div>
  );
}
