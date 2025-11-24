import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AdPreview } from '@/types';

interface AdsMapProps {
  ads: AdPreview[];
  center?: { lat: number; lng: number };
  onMarkerClick?: (adId: string) => void;
  zoom?: number;
  height?: string;
}

// Fix default Leaflet icon paths for CDN
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

// Custom marker icon with KETMAR blue
const ketmarIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'><path d='M12.5 0C5.596 0 0 5.596 0 12.5c0 9.688 12.5 28.5 12.5 28.5S25 22.188 25 12.5C25 5.596 19.404 0 12.5 0z' fill='%233B73FC'/><circle cx='12.5' cy='12.5' r='6' fill='white'/></svg>",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export function AdsMap({
  ads,
  center,
  onMarkerClick,
  zoom = 12,
  height = '400px',
}: AdsMapProps) {
  // Filter ads that have valid location data
  const adsWithLocation = ads.filter(
    (ad: AdPreview) => ad.location?.lat != null && ad.location?.lng != null
  );

  // Calculate center if not provided
  const mapCenter = center || (adsWithLocation.length > 0
    ? {
        lat: adsWithLocation[0].location!.lat!,
        lng: adsWithLocation[0].location!.lng!,
      }
    : { lat: 53.9006, lng: 27.5590 }); // Default to Minsk

  const handleMarkerClick = (adId: string) => {
    if (onMarkerClick) {
      onMarkerClick(adId);
    }
  };

  return (
    <div
      data-testid="ads-map"
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{
          height: '100%',
          width: '100%',
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {adsWithLocation.map((ad: AdPreview) => {
          const lat = ad.location!.lat!;
          const lng = ad.location!.lng!;

          return (
            <Marker
              key={ad._id}
              position={[lat, lng]}
              icon={ketmarIcon}
              eventHandlers={{
                click: () => handleMarkerClick(ad._id),
              }}
            >
              <Popup>
                <div
                  data-testid={`map-popup-${ad._id}`}
                  style={{
                    minWidth: '180px',
                    padding: '4px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--color-primary)',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ad.title}
                  </div>
                  {ad.price != null && (
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        marginBottom: '4px',
                      }}
                    >
                      {ad.price.toLocaleString('ru-RU')} {ad.currency || 'BYN'}
                    </div>
                  )}
                  {ad.city && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-secondary)',
                      }}
                    >
                      {ad.city}
                    </div>
                  )}
                  {onMarkerClick && (
                    <button
                      type="button"
                      onClick={() => handleMarkerClick(ad._id)}
                      data-testid={`map-popup-button-${ad._id}`}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '6px 12px',
                        background: 'var(--color-accent-highlight)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      Подробнее
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default AdsMap;
