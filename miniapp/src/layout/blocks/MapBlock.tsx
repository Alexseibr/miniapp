import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface MapBlockProps {
  title?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  center?: { lat: number; lng: number };
  geoRadius?: number;
  adIds?: string[];
  config?: {
    title?: string;
    latitude?: number;
    longitude?: number;
    zoom?: number;
    center?: { lat: number; lng: number };
    geoRadius?: number;
    adIds?: string[];
  };
}

export default function MapBlock(props: MapBlockProps) {
  const navigate = useNavigate();
  const title = props.title || props.config?.title;
  const center = props.center || props.config?.center;
  const geoRadius = props.geoRadius || props.config?.geoRadius;
  const adIds = props.adIds || props.config?.adIds || [];
  
  const latitude = center?.lat || props.latitude || props.config?.latitude || 53.9;
  const longitude = center?.lng || props.longitude || props.config?.longitude || 27.56667;
  const zoom = props.zoom || props.config?.zoom || 10;

  const { data: adsData } = useQuery<any>({
    queryKey: ['/api/ads/by-ids', { ids: adIds }],
    enabled: adIds.length > 0,
  });

  const ads: any[] = Array.isArray(adsData)
    ? adsData
    : Array.isArray(adsData?.ads)
      ? adsData.ads
      : Array.isArray(adsData?.items)
        ? adsData.items
        : Array.isArray(adsData?.data)
          ? adsData.data
          : [];

  return (
    <div data-testid="map-block">
      {title && (
        <h3
          style={{
            margin: '0 0 12px',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-primary)',
          }}
          data-testid="map-title"
        >
          {title}
        </h3>
      )}
      
      <div
        className="card"
        style={{
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-tertiary)',
        }}
      >
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.1}%2C${latitude - 0.1}%2C${longitude + 0.1}%2C${latitude + 0.1}&layer=mapnik&marker=${latitude}%2C${longitude}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 'var(--radius-md)',
          }}
          loading="lazy"
          title={title || 'Map'}
        />
      </div>
      
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--color-secondary)',
          marginTop: '8px',
          textAlign: 'center',
        }}
      >
        Геолокация: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        {geoRadius && ` • Радиус: ${geoRadius} км`}
      </p>

      {ads.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4
            style={{
              margin: '0 0 12px',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-secondary)',
            }}
          >
            Объявления на карте ({ads.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ads.slice(0, 3).map((ad: any) => (
              <div
                key={ad._id}
                onClick={() => navigate(`/ads/${ad._id}`)}
                className="card"
                style={{
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                data-testid={`map-ad-${ad._id}`}
              >
                {ad.photos && ad.photos.length > 0 && (
                  <img
                    src={ad.photos[0]}
                    alt={ad.title}
                    loading="lazy"
                    style={{
                      width: '50px',
                      height: '50px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ad.title}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--color-accent-highlight)',
                    }}
                  >
                    {ad.price} руб.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
