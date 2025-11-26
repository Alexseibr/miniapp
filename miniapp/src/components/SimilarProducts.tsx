import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight, Loader2, MapPin } from 'lucide-react';

interface SimilarAd {
  _id: string;
  title: string;
  price: number;
  currency?: string;
  photos?: string[];
  distanceKm?: number;
  similarityScore?: number;
}

interface SimilarProductsProps {
  adId: string;
  limit?: number;
  title?: string;
}

export default function SimilarProducts({ 
  adId, 
  limit = 6,
  title = 'Похожие товары'
}: SimilarProductsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [similarAds, setSimilarAds] = useState<SimilarAd[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (!adId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/ai/similar/${adId}?limit=${limit}`);
        const result = await response.json();
        
        if (result.success && result.data?.similarAds) {
          setSimilarAds(result.data.similarAds);
        } else {
          setError('Не удалось загрузить похожие товары');
        }
      } catch (err) {
        console.error('[SimilarProducts] Error:', err);
        setError('Ошибка загрузки');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSimilar();
  }, [adId, limit]);

  if (!adId) return null;

  if (!isLoading && similarAds.length === 0) {
    return null;
  }

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('ru-RU')} руб.`;
  };

  const getPhotoUrl = (photos?: string[]) => {
    if (!photos || photos.length === 0) {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2394a3b8" font-size="12">Нет фото</text></svg>';
    }
    const photo = photos[0];
    if (photo.startsWith('http')) return photo;
    return `/api/media/${photo}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="similar-products-section"
      style={{ marginTop: 24, marginBottom: 24 }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingLeft: 16,
        paddingRight: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="#6366f1" />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            {title}
          </span>
        </div>
        
        {similarAds.length > 3 && (
          <button
            data-testid="button-see-all-similar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: '#6366f1',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Все
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Loader2 size={24} className="animate-spin" color="#6366f1" />
          <span style={{ marginLeft: 12, color: '#64748b', fontSize: 14 }}>Ищем похожие...</span>
        </div>
      )}

      {error && (
        <div style={{ 
          color: '#ef4444', 
          fontSize: 14, 
          textAlign: 'center', 
          padding: 16,
          background: 'rgba(239, 68, 68, 0.05)',
          borderRadius: 12,
          marginLeft: 16,
          marginRight: 16
        }}>
          {error}
        </div>
      )}

      {!isLoading && similarAds.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 8,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {similarAds.map((ad, index) => (
            <Link
              key={ad._id}
              to={`/ads/${ad._id}`}
              data-testid={`similar-product-${ad._id}`}
              style={{ textDecoration: 'none' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  flexShrink: 0,
                  width: 140,
                  scrollSnapAlign: 'start',
                  background: 'white',
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: '1px solid #f1f5f9'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 120,
                    background: '#f8fafc',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={getPhotoUrl(ad.photos)}
                    alt={ad.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  
                  {ad.distanceKm !== undefined && ad.distanceKm > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '3px 6px',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 500
                      }}
                    >
                      <MapPin size={10} />
                      {ad.distanceKm} км
                    </div>
                  )}
                </div>
                
                <div style={{ padding: 10 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1e293b',
                      margin: 0,
                      marginBottom: 6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.3,
                      minHeight: 34
                    }}
                  >
                    {ad.title}
                  </p>
                  
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#2563eb',
                      margin: 0
                    }}
                  >
                    {formatPrice(ad.price)}
                  </p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
