import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAdById } from '../api/ads';
import { toggleFavorite } from '../api/favorites';

const AdViewPage = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      getAdById(id).then((res) => setData(res));
    }
  }, [id]);

  const handleToggle = async () => {
    if (!id) return;
    const res = await toggleFavorite(id);
    setFavorite(res.favorite);
  };

  if (!data) return <p className="container">Загрузка...</p>;

  const ad = data.ad || data;
  const owner = data.owner;

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <img
        src={ad.photos?.[0] || 'https://placehold.co/600x340?text=Photo'}
        alt={ad.title}
        style={{ width: '100%', borderRadius: 12 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>{ad.title}</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>{ad.category}</p>
        </div>
        <button className="button" onClick={handleToggle}>
          {favorite ? 'Убрать из избранного' : 'В избранное'}
        </button>
      </div>
      <strong style={{ fontSize: 22 }}>{ad.price} ₽</strong>
      <p>{ad.description}</p>
      {owner && (
        <div className="card">
          <h4>Продавец</h4>
          <div>{owner.firstName || owner.username}</div>
        </div>
      )}
    </div>
  );
};

export default AdViewPage;
