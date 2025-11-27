import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import AuthScreen from '@/components/AuthScreen';
import PageLoader from '@/components/PageLoader';
import { 
  Brain, 
  Bell, 
  MapPin, 
  Plus, 
  Pause, 
  Play, 
  Trash2, 
  Sparkles, 
  Clock,
  TrendingDown,
  MessageCircle,
  Settings,
  ChevronRight,
  Eye,
  Heart,
  Tag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Interest {
  categoryId?: string;
  query?: string;
  weight: number;
  lastUpdatedAt: string;
}

interface WatchItem {
  _id: string;
  title: string;
  query: string;
  categoryId?: string;
  maxPrice?: number;
  minPrice?: number;
  radiusKm?: number;
  onlyNearby?: boolean;
  notifyOnNew?: boolean;
  notifyOnPriceDrop?: boolean;
  isActive: boolean;
  matchCount?: number;
  createdAt: string;
}

interface Recommendation {
  _id: string;
  adId: string;
  type: 'new_match' | 'price_drop' | 'nearby' | 'trending' | 'similar';
  message: string;
  createdAt: string;
  isRead: boolean;
  ad?: {
    _id: string;
    title: string;
    price: number;
    photos?: string[];
  };
}

interface TwinData {
  interests: Interest[];
  watchItems: WatchItem[];
  preferences: {
    maxRadiusKmDefault?: number;
    priceSensitivity?: 'low' | 'medium' | 'high';
    notificationsEnabled?: boolean;
  };
  recommendations: Recommendation[];
  aiSummary?: string;
  stats: {
    interestsCount: number;
    watchItemsCount: number;
    activeWatchItemsCount: number;
    unreadRecommendationsCount: number;
  };
}

export default function TwinPage() {
  const user = useUserStore((state) => state.user);
  const navigate = useNavigate();
  const [twin, setTwin] = useState<TwinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (user?.telegramId) {
      fetchTwin();
    }
  }, [user?.telegramId]);

  const fetchTwin = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/twin/me?withSummary=true', {
        headers: { 'x-telegram-id': String(user?.telegramId) },
      });
      if (!response.ok) throw new Error('Failed to fetch twin');
      const data = await response.json();
      setTwin(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleWatchItem = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/twin/watch-items/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': String(user?.telegramId),
        },
        body: JSON.stringify({ isActive }),
      });
      fetchTwin();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const deleteWatchItem = async (id: string) => {
    if (!confirm('Удалить это желание?')) return;
    try {
      await fetch(`/api/twin/watch-items/${id}`, {
        method: 'DELETE',
        headers: { 'x-telegram-id': String(user?.telegramId) },
      });
      fetchTwin();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'new_match': return <Sparkles className="w-4 h-4" />;
      case 'price_drop': return <TrendingDown className="w-4 h-4" />;
      case 'nearby': return <MapPin className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  if (!user) {
    return <AuthScreen />;
  }

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="container" style={{ padding: 16, textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>Ошибка: {error}</p>
        <button className="primary" onClick={fetchTwin} style={{ marginTop: 16 }}>
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 100 }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12, 
        marginBottom: 20 
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Brain className="w-6 h-6" style={{ color: 'white' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }} data-testid="text-twin-title">
            Мой ассистент
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            Digital Twin
          </p>
        </div>
      </div>

      {twin?.aiSummary && (
        <section 
          className="card" 
          style={{ 
            marginBottom: 16, 
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd'
          }}
          data-testid="section-ai-summary"
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Sparkles className="w-5 h-5" style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, color: '#0369a1', lineHeight: 1.5 }}>
              {twin.aiSummary}
            </p>
          </div>
        </section>
      )}

      <section className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag className="w-5 h-5" style={{ color: '#8b5cf6' }} />
            Мои желания
          </h3>
          <button 
            className="primary"
            onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
            data-testid="button-add-wish"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>

        {twin?.watchItems.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
            У вас пока нет желаний. Добавьте первое!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {twin?.watchItems.map((item) => (
              <div 
                key={item._id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: item.isActive ? '#f8fafc' : '#f1f5f9',
                  border: `1px solid ${item.isActive ? '#e2e8f0' : '#cbd5e1'}`,
                  opacity: item.isActive ? 1 : 0.7,
                }}
                data-testid={`card-wish-${item._id}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, marginBottom: 4 }}>
                      {item.title}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: '#6b7280' }}>
                      {item.maxPrice && (
                        <span>до {item.maxPrice.toLocaleString()} Br</span>
                      )}
                      {item.radiusKm && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <MapPin className="w-3 h-3" />
                          {item.radiusKm} км
                        </span>
                      )}
                      {item.matchCount !== undefined && item.matchCount > 0 && (
                        <span style={{ color: '#16a34a' }}>
                          {item.matchCount} совпадений
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {item.notifyOnNew && (
                        <span style={{ 
                          fontSize: 10, 
                          padding: '2px 6px', 
                          background: '#dbeafe', 
                          color: '#2563eb',
                          borderRadius: 4 
                        }}>
                          Новые
                        </span>
                      )}
                      {item.notifyOnPriceDrop && (
                        <span style={{ 
                          fontSize: 10, 
                          padding: '2px 6px', 
                          background: '#dcfce7', 
                          color: '#16a34a',
                          borderRadius: 4 
                        }}>
                          Скидки
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => toggleWatchItem(item._id, !item.isActive)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        borderRadius: 8,
                        color: item.isActive ? '#16a34a' : '#6b7280',
                      }}
                      title={item.isActive ? 'Приостановить' : 'Возобновить'}
                      data-testid={`button-toggle-${item._id}`}
                    >
                      {item.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => deleteWatchItem(item._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        borderRadius: 8,
                        color: '#ef4444',
                      }}
                      title="Удалить"
                      data-testid={`button-delete-${item._id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {twin?.recommendations && twin.recommendations.length > 0 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell className="w-5 h-5" style={{ color: '#f59e0b' }} />
            Последние рекомендации
            {twin.stats.unreadRecommendationsCount > 0 && (
              <span style={{
                background: '#ef4444',
                color: 'white',
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 10,
              }}>
                {twin.stats.unreadRecommendationsCount}
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {twin.recommendations.slice(0, 5).map((rec) => (
              <Link
                key={rec._id}
                to={`/ads/${rec.adId}`}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: rec.isRead ? '#f8fafc' : '#fef3c7',
                  border: `1px solid ${rec.isRead ? '#e2e8f0' : '#fcd34d'}`,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                data-testid={`link-recommendation-${rec._id}`}
              >
                <div style={{ 
                  color: rec.type === 'price_drop' ? '#16a34a' : '#f59e0b',
                  flexShrink: 0 
                }}>
                  {getRecommendationIcon(rec.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14 }}>{rec.message}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                    {formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true, locale: ru })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: '#9ca3af' }} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {twin?.interests && twin.interests.length > 0 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart className="w-5 h-5" style={{ color: '#ec4899' }} />
            Ваши интересы
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {twin.interests.slice(0, 10).map((interest, idx) => (
              <span
                key={idx}
                style={{
                  padding: '6px 12px',
                  background: '#f3e8ff',
                  color: '#7c3aed',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {interest.query || 'Категория'}
              </span>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Link
          to="/twin/chat"
          className="card"
          style={{
            flex: 1,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 16,
          }}
          data-testid="link-twin-chat"
        >
          <MessageCircle className="w-6 h-6" style={{ color: '#8b5cf6' }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>AI Чат</p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Спросите ассистента</p>
          </div>
        </Link>
        <button
          onClick={() => setShowPreferences(true)}
          className="card"
          style={{
            flex: 1,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 16,
            textAlign: 'left',
          }}
          data-testid="button-preferences"
        >
          <Settings className="w-6 h-6" style={{ color: '#6b7280' }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>Настройки</p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Радиус, чувствительность</p>
          </div>
        </button>
      </div>

      {showAddModal && (
        <AddWatchItemModal
          telegramId={user.telegramId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchTwin();
          }}
        />
      )}

      {showPreferences && twin && (
        <PreferencesModal
          telegramId={user.telegramId}
          preferences={twin.preferences}
          onClose={() => setShowPreferences(false)}
          onSaved={() => {
            setShowPreferences(false);
            fetchTwin();
          }}
        />
      )}
    </div>
  );
}

function AddWatchItemModal({ 
  telegramId, 
  onClose, 
  onAdded 
}: { 
  telegramId: number; 
  onClose: () => void; 
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [radiusKm, setRadiusKm] = useState('10');
  const [notifyOnNew, setNotifyOnNew] = useState(true);
  const [notifyOnPriceDrop, setNotifyOnPriceDrop] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/twin/watch-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': String(telegramId),
        },
        body: JSON.stringify({
          title: title.trim(),
          query: title.trim(),
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          radiusKm: Number(radiusKm),
          notifyOnNew,
          notifyOnPriceDrop,
        }),
      });

      if (!response.ok) throw new Error('Failed to create');
      onAdded();
    } catch (err) {
      console.error('Create error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        style={{
          background: 'white',
          width: '100%',
          borderRadius: '20px 20px 0 0',
          padding: 20,
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 16 }}>Новое желание</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Что ищете? *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: велосипед, малина, квартира"
              style={{ width: '100%' }}
              data-testid="input-wish-title"
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Максимальная цена (Br)
            </label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Оставьте пустым для любой цены"
              style={{ width: '100%' }}
              data-testid="input-wish-price"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Радиус поиска
            </label>
            <select 
              value={radiusKm} 
              onChange={(e) => setRadiusKm(e.target.value)}
              style={{ width: '100%' }}
              data-testid="select-wish-radius"
            >
              <option value="1">1 км</option>
              <option value="3">3 км</option>
              <option value="5">5 км</option>
              <option value="10">10 км</option>
              <option value="20">20 км</option>
              <option value="50">50 км</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={notifyOnNew}
                onChange={(e) => setNotifyOnNew(e.target.checked)}
              />
              Уведомлять о новых объявлениях
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={notifyOnPriceDrop}
                onChange={(e) => setNotifyOnPriceDrop(e.target.checked)}
              />
              Уведомлять о снижении цены
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              type="button" 
              className="secondary" 
              onClick={onClose}
              style={{ flex: 1 }}
              data-testid="button-cancel-wish"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              className="primary" 
              disabled={loading || !title.trim()}
              style={{ flex: 1 }}
              data-testid="button-save-wish"
            >
              {loading ? 'Сохранение...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreferencesModal({
  telegramId,
  preferences,
  onClose,
  onSaved,
}: {
  telegramId: number;
  preferences: TwinData['preferences'];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [radiusKm, setRadiusKm] = useState(String(preferences.maxRadiusKmDefault || 10));
  const [priceSensitivity, setPriceSensitivity] = useState(preferences.priceSensitivity || 'medium');
  const [notificationsEnabled, setNotificationsEnabled] = useState(preferences.notificationsEnabled !== false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/twin/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': String(telegramId),
        },
        body: JSON.stringify({
          maxRadiusKmDefault: Number(radiusKm),
          priceSensitivity,
          notificationsEnabled,
        }),
      });
      onSaved();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        style={{
          background: 'white',
          width: '100%',
          borderRadius: '20px 20px 0 0',
          padding: 20,
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 16 }}>Настройки ассистента</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Радиус поиска по умолчанию
            </label>
            <select 
              value={radiusKm} 
              onChange={(e) => setRadiusKm(e.target.value)}
              style={{ width: '100%' }}
              data-testid="select-default-radius"
            >
              <option value="1">1 км</option>
              <option value="3">3 км</option>
              <option value="5">5 км</option>
              <option value="10">10 км</option>
              <option value="20">20 км</option>
              <option value="50">50 км</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Чувствительность к цене
            </label>
            <select 
              value={priceSensitivity} 
              onChange={(e) => setPriceSensitivity(e.target.value as 'low' | 'medium' | 'high')}
              style={{ width: '100%' }}
              data-testid="select-price-sensitivity"
            >
              <option value="low">Низкая - цена не главное</option>
              <option value="medium">Средняя - баланс цены и качества</option>
              <option value="high">Высокая - слежу за скидками</option>
            </select>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
              Влияет на советы ассистента: ждать или покупать сейчас
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
              Получать уведомления
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              type="button" 
              className="secondary" 
              onClick={onClose}
              style={{ flex: 1 }}
              data-testid="button-cancel-preferences"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              className="primary" 
              disabled={loading}
              style={{ flex: 1 }}
              data-testid="button-save-preferences"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
