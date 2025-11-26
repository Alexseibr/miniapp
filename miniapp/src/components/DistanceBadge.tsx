import { MapPin } from 'lucide-react';

interface DistanceBadgeProps {
  distanceKm?: number;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

function formatDistanceText(distanceKm?: number): string {
  if (distanceKm == null || isNaN(distanceKm)) return '';

  if (distanceKm < 0.1) {
    return '< 100 м';
  }

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 100) * 10;
    return `${meters} м`;
  }

  return `${distanceKm.toFixed(1)} км`;
}

export function DistanceBadge({ distanceKm, size = 'sm', showIcon = true }: DistanceBadgeProps) {
  const text = formatDistanceText(distanceKm);
  if (!text) return null;

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 3 : 4,
        fontSize: isSmall ? 11 : 12,
        color: '#6B7280',
        fontWeight: 500,
      }}
      data-testid="distance-badge"
    >
      {showIcon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isSmall ? 14 : 16,
            height: isSmall ? 14 : 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
            boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
          }}
        >
          <MapPin size={isSmall ? 8 : 10} color="#FFFFFF" strokeWidth={2.5} />
        </span>
      )}
      <span>{text}</span>
    </span>
  );
}

export function DistanceText({ distanceKm }: { distanceKm?: number }) {
  return <>{formatDistanceText(distanceKm)}</>;
}

export { formatDistanceText };
