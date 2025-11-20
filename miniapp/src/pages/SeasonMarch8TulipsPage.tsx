import { useEffect, useMemo, useState } from 'react';
import { listAds } from '@/api/ads';
import { AdPreview } from '@/types';
import { ATTRIBUTE_SCHEMAS } from '@shared/attributeSchemas';

const TABS = [
  { code: 'tulips_single', label: 'По штуке' },
  { code: 'tulip_bouquets', label: 'Букеты' },
];

export default function SeasonMarch8TulipsPage() {
  const [subcategory, setSubcategory] = useState<string>('tulips_single');
  const [color, setColor] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [items, setItems] = useState<AdPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = useMemo(() => ATTRIBUTE_SCHEMAS.tulips_single[0].options || [], []);

  useEffect(() => {
    async function loadAds() {
      setLoading(true);
      setError(null);
      try {
        const response = await listAds({
          seasonCode: 'march8_tulips',
          subcategoryCode: subcategory,
          priceMin: priceMin ? Number(priceMin) : undefined,
          priceMax: priceMax ? Number(priceMax) : undefined,
          color: color || undefined,
        });
        setItems(response.items || []);
      } catch (e) {
        setError('Не удалось загрузить объявления');
      } finally {
        setLoading(false);
      }
    }

    loadAds();
  }, [subcategory, color, priceMin, priceMax]);

  return (
    <div className="page">
      <h2>Ярмарка 8 Марта — тюльпаны</h2>
      <p className="muted">Сезонные предложения с доставкой или самовывозом.</p>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.code}
            className={tab.code === subcategory ? 'tab tab--active' : 'tab'}
            onClick={() => setSubcategory(tab.code)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card filters">
        <div className="filters__row">
          <label>
            Цвет
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="">Любой</option>
              {colors.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Цена от
            <input value={priceMin} onChange={(e) => setPriceMin(e.target.value)} type="number" />
          </label>
          <label>
            Цена до
            <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} type="number" />
          </label>
        </div>
      </div>

      {loading && <p>Загрузка...</p>}
      {error && <p className="error">{error}</p>}

      <div className="cards-grid">
        {items.map((ad) => (
          <div key={ad._id} className="card">
            {ad.photos?.[0] && <img src={ad.photos[0]} alt={ad.title} className="card__thumb" />}
            <h3>{ad.title}</h3>
            <p className="muted">{ad.attributes?.color ? `Цвет: ${ad.attributes.color}` : null}</p>
            <p className="muted">
              {ad.attributes?.stem_length_cm ? `Стебель: ${ad.attributes.stem_length_cm} см` : ''}
              {ad.attributes?.quantity ? ` · Кол-во: ${ad.attributes.quantity}` : ''}
              {ad.attributes?.packing_type ? ` · Упаковка: ${ad.attributes.packing_type}` : ''}
            </p>
            <p className="price">{ad.price} {ad.currency || 'BYN'}</p>
            <button className="button button--primary">Связаться в Telegram</button>
          </div>
        ))}
      </div>
    </div>
  );
}
