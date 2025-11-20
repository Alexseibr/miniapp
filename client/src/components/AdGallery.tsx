import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const NO_PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='24' font-family='Arial, sans-serif'>No Photo</text></svg>";

interface AdGalleryProps {
  images?: string[];
}

export function AdGallery({ images = [] }: AdGalleryProps) {
  const sanitizedImages = images.filter((url) => typeof url === "string" && url.trim());
  const galleryImages = sanitizedImages.length ? sanitizedImages : [NO_PHOTO_PLACEHOLDER];

  if (galleryImages.length === 1) {
    return (
      <div className="w-full max-h-[350px] overflow-hidden rounded-lg bg-muted/40">
        <img
          src={galleryImages[0]}
          alt="Фото объявления"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <Swiper modules={[Navigation, Pagination]} navigation pagination className="w-full max-h-[350px] rounded-lg overflow-hidden">
      {galleryImages.map((url) => (
        <SwiperSlide key={url}>
          <div className="w-full h-[320px] bg-muted/40">
            <img src={url} alt="Фото объявления" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

export default AdGallery;
