import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listAds } from '@/api/ads';
import { NearbyAdsButton } from '@/components/NearbyAdsButton';
import { useFavorites } from '@/features/favorites/useFavorites';
import { AdPreview, AdsResponse } from '@/types';

type RequestState = 'idle' | 'loading' | 'success' | 'error';

function getDeliveryIcon(ad: AdPreview) {
  if (ad.deliveryType === 'delivery_only' || ad.deliveryType === 'delivery_and_pickup') {
    return { icon: '🚚', label: 'Доставка доступна' };
  }
  if (ad.deliveryType === 'pickup_only') {
    return { icon: '📍', label: 'Самовывоз' };
  }
  const hasDeliveryOption = ad.deliveryOptions?.some((option) => option.type?.includes('delivery'));
  return hasDeliveryOption ? { icon: '🚚', label: 'Доставка возможна' } : { icon: '📍', label: 'Самовывоз' };
}

function truncate(text?: string, limit = 140) {
  if (!text) return 'Описание пока не добавлено';
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

export default function AdsPage() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');

  const [ads, setAds] = useState<AdPreview[]>([]);
  const [state, setState] = useState<RequestState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdPreview | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  const filters = useMemo(
    () => (
      [category && `Категория: ${category}`, subcategory && `Подкатегория: ${subcategory}`]
        .filter(Boolean)
        .join(' • ')
    ),
    [category, subcategory],
  );

  const loadAds = async () => {
    setState('loading');
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (category) params.categoryId = category;
      if (subcategory) params.subcategoryId = subcategory;
      const response: AdsResponse = await listAds(params);
      setAds(response.items || []);
      setState('success');
    } catch (err) {
      setError('Не удалось загрузить объявления, попробуйте обновить страницу.');
      setAds([]);
      setState('error');
    }
  };

  useEffect(() => {
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcategory]);

  const filteredAds = useMemo(() => {
    const list = [...ads];
    if (showFavoritesOnly) {
      return list.filter((item) => isFavorite(item._id));
    }
    return list;
  }, [ads, showFavoritesOnly, favorites, isFavorite]);

  return (
    <div className="page-grid">
      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Объявления</p>
            <h2 className="card__title">Список предложений</h2>
            <p className="muted">
              {filters || 'Все объявления'}
            </p>
          </div>
          <button type="button" className="secondary" onClick={loadAds} disabled={state === 'loading'}>
            {state === 'loading' ? 'Обновляем…' : 'Обновить'}
          </button>
        </div>

        <NearbyAdsButton
          categoryId={category || undefined}
          subcategoryId={subcategory || undefined}
          radiusKm={5}
        />

        <div className="card card--sub" style={{ marginBottom: 16 }}>
          <div className="ad-card__header" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p className="eyebrow">Фильтрация</p>
              <p className="muted">Отобразить только избранные объявления</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(event) => setShowFavoritesOnly(event.target.checked)}
              />
              Показывать только избранное
            </label>
          </div>
          {showFavoritesOnly && !favorites.length && (
            <p className="muted" style={{ marginTop: 8 }}>
              Избранных объявлений пока нет. Нажмите на сердечко в карточке, чтобы добавить объявление.
            </p>
          )}
        </div>

        {state === 'loading' && <p className="muted">Загружаем объявления…</p>}
        {state === 'error' && <div className="error-box"><p className="error-box__body">{error}</p></div>}

        {state === 'success' && filteredAds.length === 0 && <p className="muted">Объявлений пока нет.</p>}

        {filteredAds.length > 0 && (
          <div className="ads-grid">
            {filteredAds.map((ad) => {
              const delivery = getDeliveryIcon(ad);
              return (
                <article key={ad._id} className="card card--sub ad-card" onClick={() => setSelected(ad)}>
                  <div className="ad-card__header" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <h3 className="card__title" style={{ marginRight: 12 }}>{ad.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge">{ad.price.toLocaleString('ru-RU')} ₽</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavorite(ad._id);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: '1.3rem',
                          cursor: 'pointer',
                        }}
                        aria-label={isFavorite(ad._id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                      >
                        {isFavorite(ad._id) ? '❤️' : '🤍'}
                      </button>
                    </div>
                  </div>
                  <p className="muted ad-card__meta">
                    Категория: {category || ad.categoryId || '—'} / {subcategory || ad.subcategoryId || '—'}
                  </p>
                  <p className="ad-card__description">{truncate(ad.description)}</p>
                  <div className="ad-card__footer">
                    <span>{delivery.icon} {delivery.label}</span>
                    {ad.distanceKm !== undefined && <span className="muted">{ad.distanceKm.toFixed(1)} км</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="card__header card__header--compact">
              <div>
                <p className="eyebrow">Детали объявления</p>
                <h3 className="card__title">{selected.title}</h3>
              </div>
              <button type="button" className="secondary" onClick={() => setSelected(null)}>
                Закрыть
              </button>
            </div>
            <p className="muted">Цена: {selected.price.toLocaleString('ru-RU')} ₽</p>
            {selected.description && <p className="ad-card__description">{selected.description}</p>}
            <div className="card card--sub" style={{ marginTop: 12 }}>
              <p className="eyebrow">Дополнительные поля</p>
              <pre className="code-block">{JSON.stringify(selected.attributes || selected, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
