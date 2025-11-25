import { memo, useRef, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  style?: CSSProperties;
  className?: string;
  fallback?: ReactNode;
  onError?: () => void;
  rootMargin?: string;
  threshold?: number;
  priority?: boolean;
  'data-testid'?: string;
}

const imageCache = new Map<string, 'loading' | 'loaded' | 'error'>();
const imageLoadListeners = new Map<string, Set<() => void>>();

const OptimizedImage = memo(({ 
  src,
  alt,
  style,
  className,
  fallback,
  onError,
  rootMargin = '100px',
  threshold = 0.01,
  priority = false,
  'data-testid': testId
}: OptimizedImageProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(priority);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>(() => {
    return imageCache.get(src) || 'loading';
  });

  useEffect(() => {
    if (priority || !containerRef.current) return;

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
  }, [rootMargin, threshold, priority]);

  useEffect(() => {
    if (!isVisible) return;

    const cachedState = imageCache.get(src);
    if (cachedState === 'loaded' || cachedState === 'error') {
      setLoadState(cachedState);
      return;
    }

    if (imageCache.get(src) === 'loading') {
      const listeners = imageLoadListeners.get(src) || new Set();
      const listener = () => {
        setLoadState(imageCache.get(src) || 'loading');
      };
      listeners.add(listener);
      imageLoadListeners.set(src, listeners);
      return () => {
        listeners.delete(listener);
      };
    }

    imageCache.set(src, 'loading');

    const img = new Image();
    
    img.onload = () => {
      imageCache.set(src, 'loaded');
      setLoadState('loaded');
      const listeners = imageLoadListeners.get(src);
      listeners?.forEach(listener => listener());
      imageLoadListeners.delete(src);
    };

    img.onerror = () => {
      imageCache.set(src, 'error');
      setLoadState('error');
      if (onError) onError();
      const listeners = imageLoadListeners.get(src);
      listeners?.forEach(listener => listener());
      imageLoadListeners.delete(src);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isVisible, src, onError]);

  const isLoading = loadState === 'loading';
  const hasError = loadState === 'error';
  const isLoaded = loadState === 'loaded';

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
      ) : (isLoaded || isVisible) ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={{
            width: '100%',
            height: '100%',
            objectFit: style?.objectFit || 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
          }}
        />
      ) : null}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
