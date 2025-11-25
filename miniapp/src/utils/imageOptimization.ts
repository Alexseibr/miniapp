export interface ResponsiveImageSizes {
  thumbnail: string; // 200w
  small: string;     // 400w
  medium: string;    // 800w
  large: string;     // 1200w
  original: string;  // full size
}

const ENABLE_RESPONSIVE_IMAGES = false;

export function getResponsiveImageUrls(originalUrl: string): ResponsiveImageSizes {
  if (!originalUrl || originalUrl.startsWith('data:') || !ENABLE_RESPONSIVE_IMAGES) {
    return {
      thumbnail: originalUrl,
      small: originalUrl,
      medium: originalUrl,
      large: originalUrl,
      original: originalUrl,
    };
  }

  const urlParts = originalUrl.split('?');
  const baseUrl = urlParts[0];
  const queryParams = urlParts[1] ? `?${urlParts[1]}` : '';

  const addSizeParam = (size: string) => {
    if (queryParams) {
      return `${baseUrl}?size=${size}&${urlParts[1]}`;
    }
    return `${baseUrl}?size=${size}`;
  };

  return {
    thumbnail: addSizeParam('200'),
    small: addSizeParam('400'),
    medium: addSizeParam('800'),
    large: addSizeParam('1200'),
    original: originalUrl,
  };
}

export function generateSrcSet(imageUrl: string): string {
  const sizes = getResponsiveImageUrls(imageUrl);
  
  return `${sizes.thumbnail} 200w, ${sizes.small} 400w, ${sizes.medium} 800w, ${sizes.large} 1200w, ${sizes.original} 2000w`;
}

export function generateAdCardSizes(): string {
  return '(max-width: 640px) 33vw, (max-width: 768px) 50vw, 33vw';
}

export function generateAdPageSizes(): string {
  return '(max-width: 640px) 100vw, (max-width: 768px) 90vw, 800px';
}

export function generateThumbnailSizes(): string {
  return '(max-width: 640px) 33vw, (max-width: 768px) 25vw, 200px';
}
