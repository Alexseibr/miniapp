import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdCard from '../components/AdCard';
import { toggleFavorite, getFavorites } from '../api/favorites';
import { useAdStore } from '../store/ad';

const categories = [
  { label: 'Все', value: '' },
  { label: 'Фермерство', value: 'farm' },
  { label: 'Ремесла', value: 'crafts' },
  { label: 'Подарки', value: 'gifts' },
];

const MarketPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ads, loadAds, loading } = useAdStore();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const selectedCategory = searchParams.get('niche') || '';
  const scope = searchParams.get('scope');

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (selectedCategory) filters.category = selectedCategory;
    if (scope === 'all') filters.status = 'active';
    if (search) filters.search = search;
    loadAds(filters);
  }, [selectedCategory, scope, search, loadAds]);

  useEffect(() => {
    getFavorites().then((list) => setFavorites(list.map((f: any) => f.adId?._id || f.adId)));
  }, []);

  const sortedAds = useMemo(() => {
    const arr = [...ads];
    if (sort === 'price_asc') arr.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') arr.sort((a, b) => b.price - a.price);
    return arr;
  }, [ads, sort]);

  const handleToggleFavorite = async (id: string) => {
    const res = await toggleFavorite(id);
    if (res.favorite) {
      setFavorites((prev) => Array.from(new Set([...prev, id])));
    } else {
      setFavorites((prev) => prev.filter((f) => f !== id));
    }
  };

  return (
    <div className="container">
      <h3>Маркетплейс</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select
          value={selectedCategory}
          onChange={(e) => {
            const val = e.target.value;
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              if (val) next.set('niche', val);
              else next.delete('niche');
              return next;
            });
          }}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Поиск"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Сначала новые</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
        </select>
      </div>

      {loading && <p>Загрузка...</p>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {sortedAds.map((ad) => (
          <AdCard
            key={ad._id || ad.id}
            ad={ad}
            isFavorite={favorites.includes(ad._id || ad.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
};

export default MarketPage;
