import { memo, useRef, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  style?: CSSProperties;
  className?: string;
  fallback?: ReactNode;
  onError?: () => void;
  rootMargin?: string;
  threshold?: number;
  'data-testid'?: string;
}

const LazyImage = memo(({ 
  src, 
  alt, 
  placeholder,
  style, 
  className,
  fallback,
  onError,
  rootMargin = '50px',
  threshold = 0.01,
  'data-testid': testId
}: LazyImageProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(placeholder || null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  useEffect(() => {
    if (!isVisible || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setImgSrc(src);
      setIsLoaded(true);
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoaded(true);
      if (onError) onError();
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isVisible, src, onError]);

  const isLoading = !imgSrc && !hasError;

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        display: hasError && fallback ? 'flex' : style?.display,
        alignItems: hasError && fallback ? 'center' : undefined,
        justifyContent: hasError && fallback ? 'center' : undefined,
        backgroundColor: isLoading ? '#F5F7FA' : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
      className={className}
      data-testid={testId}
    >
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}
      {hasError && fallback ? (
        fallback
      ) : imgSrc ? (
        <img
          src={imgSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            height: '100%',
            objectFit: style?.objectFit || 'cover',
            opacity: !isLoaded && placeholder ? 0.3 : 1,
            filter: !isLoaded && placeholder ? 'blur(20px)' : 'none',
            transform: !isLoaded && placeholder ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.4s ease-out',
          }}
        />
      ) : null}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
