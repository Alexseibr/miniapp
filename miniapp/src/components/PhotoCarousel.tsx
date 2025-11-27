import { useState, useCallback, useRef, useEffect } from 'react';

interface PhotoCarouselProps {
  images: string[];
  title: string;
  onImageLoad?: () => void;
  onImageError?: () => void;
  isActive?: boolean;
}

export default function PhotoCarousel({
  images,
  title,
  onImageLoad,
  onImageError,
  isActive = true,
}: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 50;

  useEffect(() => {
    setCurrentIndex(0);
    setLoadedImages(new Set());
  }, [images.length]);

  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
    if (index === 0 && onImageLoad) {
      onImageLoad();
    }
  }, [onImageLoad]);

  const handleImageError = useCallback((index: number) => {
    if (index === 0 && onImageError) {
      onImageError();
    }
  }, [onImageError]);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, images.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    e.stopPropagation();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    const absX = Math.abs(touchDeltaX.current);
    if (absX > 10) {
      e.stopPropagation();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const absX = Math.abs(touchDeltaX.current);
    
    if (absX > SWIPE_THRESHOLD) {
      e.stopPropagation();
      if (touchDeltaX.current < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchDeltaX.current = 0;
  }, [goToNext, goToPrev]);

  if (images.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        touchAction: 'pan-y',
      }}
    >
      {/* Images container */}
      <div
        style={{
          display: 'flex',
          width: `${images.length * 100}%`,
          height: '100%',
          transform: `translateX(-${currentIndex * (100 / images.length)}%)`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {images.map((src, index) => (
          <div
            key={src}
            style={{
              width: `${100 / images.length}%`,
              height: '100%',
              flexShrink: 0,
            }}
          >
            <img
              src={src}
              alt={`${title} - фото ${index + 1}`}
              loading={index === 0 && isActive ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageError(index)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: loadedImages.has(index) || index > 0 ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          </div>
        ))}
      </div>

      {/* Photo indicators */}
      {images.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
            padding: '6px 10px',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            zIndex: 5,
          }}
        >
          {images.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: index === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
