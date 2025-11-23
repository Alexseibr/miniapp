import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { Ad } from '@/types';
import EmptyState from '@/widgets/EmptyState';
import { formatRelativeTime } from '@/utils/time';
import { Plus, Eye, Edit, Archive, TrendingUp } from 'lucide-react';

export default function MyAdsPage() {
  const user = useUserStore((state) => state.user);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');

  useEffect(() => {
    async function loadMyAds() {
      if (!user?.telegramId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/ads/my?sellerTelegramId=${user.telegramId}`);
        if (!response.ok) throw new Error('Failed to fetch ads');
        const data = await response.json();
        setAds(data.items || []);
      } catch (error) {
        console.error('Error loading my ads:', error);
        setAds([]);
      } finally {
        setLoading(false);
      }
    }

    loadMyAds();
  }, [user]);

  const filteredAds = ads.filter((ad) => {
    if (filter === 'active') return ad.status === 'active' || ad.status === 'draft';
    if (filter === 'archived') return ad.status === 'archived' || ad.status === 'sold';
    return true;
  });

  const getStatusBadge = (status: string, moderationStatus?: string) => {
    if (moderationStatus === 'rejected') {
      return <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Отклонено</span>;
    }
    if (moderationStatus === 'pending') {
      return <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>На модерации</span>;
    }
    if (status === 'active') {
      return <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>Активно</span>;
    }
    if (status === 'sold') {
      return <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Продано</span>;
    }
    if (status === 'archived') {
      return <span className="badge" style={{ background: '#e5e7eb', color: '#6b7280' }}>В архиве</span>;
    }
    if (status === 'draft') {
      return <span className="badge" style={{ background: '#f3f4f6', color: '#6b7280' }}>Черновик</span>;
    }
    return null;
  };

  if (!user) {
    return (
      <div className="container">
        <EmptyState
          title="Требуется авторизация"
          description="Откройте MiniApp из чата с ботом"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Загрузка объявлений...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Мои объявления</h1>
        <Link
          to="/ads/create"
          className="primary"
          style={{
            width: 'auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
          }}
          data-testid="button-create-ad"
        >
          <Plus size={20} />
          Создать
        </Link>
      </div>

      <div className="tab-nav" style={{ marginBottom: 20 }}>
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
          data-testid="filter-all"
        >
          Все ({ads.length})
        </button>
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
          data-testid="filter-active"
        >
          Активные ({ads.filter((a) => a.status === 'active' || a.status === 'draft').length})
        </button>
        <button
          className={filter === 'archived' ? 'active' : ''}
          onClick={() => setFilter('archived')}
          data-testid="filter-archived"
        >
          Архив ({ads.filter((a) => a.status === 'archived' || a.status === 'sold').length})
        </button>
      </div>

      {filteredAds.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'Нет объявлений' : `Нет ${filter === 'active' ? 'активных' : 'архивных'} объявлений`}
          description={filter === 'all' ? 'Создайте первое объявление, нажав кнопку выше' : ''}
        />
      ) : (
        <div className="grid" data-testid="ads-list">
          {filteredAds.map((ad) => (
            <article key={ad._id} className="card" data-testid={`ad-card-${ad._id}`}>
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
                {getStatusBadge(ad.status || 'draft', ad.moderationStatus)}
              </div>

              {ad.description && (
                <p style={{ fontSize: 14, color: '#475467', marginBottom: 12, lineHeight: 1.5 }}>
                  {ad.description.slice(0, 100)}{ad.description.length > 100 ? '...' : ''}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {ad.price.toLocaleString('ru-RU')} {ad.currency || 'BYN'}
                  </div>
                  {ad.createdAt && (
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                      {formatRelativeTime(ad.createdAt)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#6b7280' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={16} />
                    <span>{ad.views || 0}</span>
                  </div>
                  {ad.isLiveSpot && (
                    <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                      📍 Живая точка
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
          ))}
        </div>
      )}

      {ads.length > 0 && (
        <div className="card" style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '12px 0' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>{ads.length}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Всего</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>
                {ads.filter((a) => a.status === 'active').length}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Активных</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#9ca3af' }}>
                {ads.reduce((sum, a) => sum + (a.views || 0), 0)}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Просмотров</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
