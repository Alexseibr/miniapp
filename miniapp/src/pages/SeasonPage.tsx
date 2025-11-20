import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdCard from '../components/AdCard';
import { useAdStore } from '../store/ad';

const SeasonPage = () => {
  const { seasonCode } = useParams();
  const { ads, loadAds, loading } = useAdStore();

  useEffect(() => {
    if (seasonCode) {
      loadAds({ seasonCode });
    }
  }, [seasonCode, loadAds]);

  return (
    <div>
      <h3>Сезонная витрина: {seasonCode}</h3>
      {loading && <p>Загрузка...</p>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {ads.map((ad) => (
          <AdCard key={ad._id || ad.id} ad={ad} />
        ))}
      </div>
    </div>
  );
};

export default SeasonPage;
