interface MapBlockProps {
  title?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  config?: {
    title?: string;
    latitude?: number;
    longitude?: number;
    zoom?: number;
  };
}

export default function MapBlock(props: MapBlockProps) {
  const title = props.title || props.config?.title;
  const latitude = props.latitude || props.config?.latitude || 53.9;
  const longitude = props.longitude || props.config?.longitude || 27.56667;
  const zoom = props.zoom || props.config?.zoom || 10;

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
      </p>
    </div>
  );
}
