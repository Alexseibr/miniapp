import { Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { NO_PHOTO_PLACEHOLDER, getFullImageUrl } from '@/constants/placeholders';

interface AdGalleryProps {
  images?: string[];
  alt?: string;
}

export function AdGallery({ images = [], alt = 'Фото объявления' }: AdGalleryProps) {
  const sanitizedImages = images
    .filter((url: string) => typeof url === 'string' && url.trim())
    .map(url => getFullImageUrl(url));
  const galleryImages = sanitizedImages.length ? sanitizedImages : [NO_PHOTO_PLACEHOLDER];

  if (galleryImages.length === 1) {
    return (
      <div
        data-testid="ad-gallery-single"
        style={{
          width: '100%',
          maxHeight: '350px',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-tertiary)',
        }}
      >
        <img
          src={galleryImages[0]}
          alt={alt}
          loading="lazy"
          decoding="async"
          data-testid="ad-gallery-image-0"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="ad-gallery-swiper"
      style={{
        width: '100%',
        maxHeight: '350px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      <Swiper
        modules={[Navigation, Pagination]}
        navigation
        pagination={{ clickable: true }}
        style={{
          width: '100%',
          maxHeight: '350px',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {galleryImages.map((url: string, index: number) => (
          <SwiperSlide key={url}>
            <div
              style={{
                width: '100%',
                height: '320px',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={url}
                alt={`${alt} ${index + 1}`}
                loading="lazy"
                decoding="async"
                data-testid={`ad-gallery-image-${index}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default AdGallery;
