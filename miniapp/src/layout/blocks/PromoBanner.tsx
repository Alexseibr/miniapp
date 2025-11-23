import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface PromoBannerProps {
  slotId?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  link?: string;
  backgroundColor?: string;
  textColor?: string;
  config?: {
    slotId?: string;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    link?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

export default function PromoBanner(props: PromoBannerProps) {
  const slotId = props.slotId || props.config?.slotId;
  const [imageLoaded, setImageLoaded] = useState(false);

  const { data: slotData } = useQuery<any>({
    queryKey: ['/api/content/slot', slotId],
    enabled: !!slotId,
  });

  const title = props.title || props.config?.title || slotData?.data?.title;
  const subtitle = props.subtitle || props.config?.subtitle || slotData?.data?.subtitle;
  const imageUrl = props.imageUrl || props.config?.imageUrl || slotData?.data?.imageUrl;
  const link = props.link || props.config?.link || slotData?.data?.link;
  const backgroundColor = props.backgroundColor || props.config?.backgroundColor || 'var(--bg-tertiary)';
  const textColor = props.textColor || props.config?.textColor || 'var(--color-primary)';

  if (!title && !imageUrl) {
    return null;
  }

  const handleClick = () => {
    if (link) {
      window.location.href = link;
    }
  };

  return (
    <div
      onClick={handleClick}
      className="card"
      style={{
        cursor: link ? 'pointer' : 'default',
        background: backgroundColor,
        color: textColor,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
      data-testid="promo-banner"
    >
      {imageUrl && (
        <div style={{ flex: '0 0 auto' }}>
          {!imageLoaded && (
            <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)' }} />
          )}
          <img
            src={imageUrl}
            alt={title || 'Promo'}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
              display: imageLoaded ? 'block' : 'none',
            }}
          />
        </div>
      )}
      
      <div style={{ flex: 1 }}>
        {title && (
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
            }}
            data-testid="promo-title"
          >
            {title}
          </h3>
        )}
        {subtitle && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '0.875rem',
              opacity: 0.8,
            }}
            data-testid="promo-subtitle"
          >
            {subtitle}
          </p>
        )}
      </div>

      {link && (
        <div style={{ flex: '0 0 auto', color: 'var(--color-accent-highlight)', fontSize: '1.5rem' }}>
          →
        </div>
      )}
    </div>
  );
}
