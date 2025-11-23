import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface HeroBannerProps {
  slotId?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  link?: string;
  config?: {
    slotId?: string;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    link?: string;
  };
}

export default function HeroBanner(props: HeroBannerProps) {
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

  if (!imageUrl && !title) {
    return null;
  }

  const handleClick = () => {
    if (link) {
      window.location.href = link;
    }
  };

  return (
    <div
      className="hero-banner"
      onClick={handleClick}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: link ? 'pointer' : 'default',
        minHeight: '200px',
        background: 'var(--bg-tertiary)',
      }}
      data-testid="hero-banner"
    >
      {imageUrl && (
        <>
          {!imageLoaded && (
            <div className="skeleton" style={{ width: '100%', height: '200px' }} />
          )}
          <img
            src={imageUrl}
            alt={title || 'Hero banner'}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            style={{
              width: '100%',
              height: 'auto',
              minHeight: '200px',
              objectFit: 'cover',
              display: imageLoaded ? 'block' : 'none',
            }}
          />
        </>
      )}
      
      {(title || subtitle) && (
        <div
          style={{
            position: imageUrl ? 'absolute' : 'relative',
            bottom: 0,
            left: 0,
            right: 0,
            background: imageUrl
              ? 'linear-gradient(to top, rgba(15, 23, 42, 0.8), transparent)'
              : 'transparent',
            padding: '24px',
            color: imageUrl ? '#fff' : 'var(--color-primary)',
          }}
        >
          {title && (
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
                fontWeight: 700,
              }}
              data-testid="hero-title"
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '1rem',
                opacity: 0.9,
              }}
              data-testid="hero-subtitle"
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
