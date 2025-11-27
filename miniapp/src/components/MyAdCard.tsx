import { Link } from 'wouter';
import { Eye, MapPin, Edit } from 'lucide-react';
import { Ad } from '@/types';
import { formatRelativeTime } from '@/utils/time';
import { ScheduledAdBadge } from './schedule/ScheduledAdBadge';
import { JustPublishedChip, isJustPublished } from './schedule/JustPublishedChip';

interface MyAdCardProps {
  ad: Ad;
  index: number;
  getStatusBadge: (ad: Ad) => React.ReactNode;
}

export default function MyAdCard({ ad, index, getStatusBadge }: MyAdCardProps) {
  const justPublished = isJustPublished(ad);
  
  return (
    <article
      key={ad._id}
      className={`card my-ad-card--animated ${justPublished ? 'my-ad-card--just-published' : ''}`}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
      data-testid={`ad-card-${ad._id}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <Link
            to={`/ads/${ad._id}`}
            style={{ fontSize: 16, fontWeight: 600, display: 'block', marginBottom: 4 }}
            data-testid={`ad-title-${ad._id}`}
          >
            {ad.title}
          </Link>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            {ad.categoryId} {ad.subcategoryId && `/ ${ad.subcategoryId}`}
          </p>
        </div>
        {getStatusBadge(ad)}
      </div>

      {justPublished && (
        <div style={{ marginBottom: 12 }}>
          <JustPublishedChip />
        </div>
      )}

      {ad.status === 'scheduled' && ad.publishAt && (
        <ScheduledAdBadge publishAt={ad.publishAt} />
      )}

      {ad.description && (
        <p style={{ fontSize: 14, color: '#475467', marginBottom: 12, lineHeight: 1.5 }}>
          {ad.description.slice(0, 100)}{ad.description.length > 100 ? '...' : ''}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {ad.price?.toLocaleString('ru-RU') || '0'} руб.
          </div>
          {ad.createdAt && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              {formatRelativeTime(ad.createdAt)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#6b7280' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} data-testid={`ad-views-${ad._id}`}>
            <Eye size={16} />
            <span>{ad.views || 0}</span>
          </div>
          {ad.isLiveSpot && (
            <span className="badge" style={{ background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} /> Живая точка
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link
          to={`/ads/${ad._id}`}
          className="secondary"
          style={{ flex: 1, textAlign: 'center', textDecoration: 'none', lineHeight: '42px', padding: '0 12px' }}
          data-testid={`button-view-${ad._id}`}
        >
          Просмотр
        </Link>
        <Link
          to={`/ads/${ad._id}/edit`}
          className="secondary"
          style={{ flex: 1, textAlign: 'center', textDecoration: 'none', lineHeight: '42px', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          data-testid={`button-edit-${ad._id}`}
        >
          <Edit size={16} />
          Редактировать
        </Link>
      </div>
    </article>
  );
}
