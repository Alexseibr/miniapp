import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useUserStore } from '@/store/useUserStore';
import { Ad } from '@/types';
import { fetchMyAds } from '@/api/ads';
import EmptyState from '@/widgets/EmptyState';
import { Plus, Loader2, Clock } from 'lucide-react';
import { ScheduledAdChip } from '@/components/schedule/ScheduledAdBadge';
import MyAdCard from '@/components/MyAdCard';

export default function MyAdsPage() {
  const user = useUserStore((state) => state.user);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'archived'>('all');

  useEffect(() => {
    async function loadMyAds() {
      if (!user?.telegramId) {
        setLoading(false);
        return;
      }

      try {
        setError('');
        const data = await fetchMyAds(user.telegramId);
        setAds(data.items || []);
      } catch (err: any) {
        console.error('Error loading my ads:', err);
        setError(err.message || 'Не удалось загрузить объявления');
        setAds([]);
      } finally {
        setLoading(false);
      }
    }

    loadMyAds();
  }, [user]);

  const scheduledAds = ads.filter((ad) => ad.status === 'scheduled');
  const activeAds = ads.filter((ad) => ad.status === 'active' || ad.status === 'draft');
  const archivedAds = ads.filter((ad) => ad.status === 'archived' || ad.status === 'sold');
  
  const filteredAds = ads.filter((ad) => {
    if (filter === 'active') return ad.status === 'active' || ad.status === 'draft';
    if (filter === 'scheduled') return ad.status === 'scheduled';
    if (filter === 'archived') return ad.status === 'archived' || ad.status === 'sold';
    return true;
  });

  const getStatusBadge = (ad: Ad) => {
    const { status, moderationStatus, publishAt } = ad;
    
    if (status === 'scheduled' && publishAt) {
      return <ScheduledAdChip publishAt={publishAt} />;
    }
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
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#6b7280' }} />
          <div style={{ fontSize: 14, color: '#6b7280' }}>Загрузка объявлений...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <EmptyState
          title="Ошибка загрузки"
          description={error}
        />
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

      <div className="tab-nav" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
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
          Активные ({activeAds.length})
        </button>
        {scheduledAds.length > 0 && (
          <button
            className={filter === 'scheduled' ? 'active' : ''}
            onClick={() => setFilter('scheduled')}
            style={{
              background: filter === 'scheduled' ? '#EEF2FF' : undefined,
              borderColor: filter === 'scheduled' ? '#6366F1' : undefined,
              color: filter === 'scheduled' ? '#4338CA' : undefined,
            }}
            data-testid="filter-scheduled"
          >
            <Clock size={14} style={{ marginRight: 4 }} />
            Запланированные ({scheduledAds.length})
          </button>
        )}
        <button
          className={filter === 'archived' ? 'active' : ''}
          onClick={() => setFilter('archived')}
          data-testid="filter-archived"
        >
          Архив ({archivedAds.length})
        </button>
      </div>

      {filteredAds.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'Нет объявлений' : `Нет ${filter === 'active' ? 'активных' : 'архивных'} объявлений`}
          description={filter === 'all' ? 'Создайте первое объявление, нажав кнопку выше' : ''}
        />
      ) : (
        <div className="grid" data-testid="ads-list">
          {filteredAds.map((ad, index) => (
            <MyAdCard
              key={ad._id}
              ad={ad}
              index={index}
              getStatusBadge={getStatusBadge}
            />
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
