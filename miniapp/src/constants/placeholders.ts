export const NO_PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23F5F6F8'/><g transform='translate(400, 300)'><rect x='-60' y='-40' width='120' height='80' rx='8' fill='%23E5E7EB'/><circle cx='0' cy='-10' r='15' fill='%239CA3AF'/><path d='M-40 30 L-20 10 L0 30 L20 0 L40 30' stroke='%239CA3AF' stroke-width='3' fill='none'/></g><text x='50%' y='65%' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-size='18' font-family='Inter, sans-serif'>Нет фото</text></svg>";

export const LOADING_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%231a1a2e'/><g transform='translate(400, 300)'><circle cx='0' cy='0' r='30' stroke='%233A7BFF' stroke-width='4' fill='none' stroke-dasharray='60 30'><animateTransform attributeName='transform' type='rotate' from='0' to='360' dur='1s' repeatCount='indefinite'/></circle></g></svg>";

export const API_PLACEHOLDER_URL = '/api/media/placeholder';

export function getPhotoUrl(photoUrl: string | undefined | null): string {
  if (!photoUrl) {
    return NO_PHOTO_PLACEHOLDER;
  }
  
  if (photoUrl.startsWith('data:')) {
    return photoUrl;
  }
  
  if (photoUrl.startsWith('/api/media/')) {
    return photoUrl;
  }
  
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return `/api/media/proxy?url=${encodeURIComponent(photoUrl)}`;
  }
  
  return photoUrl;
}

export function getOptimizedPhotoUrl(
  photoUrl: string | undefined | null,
  width?: number,
  height?: number,
  quality?: number
): string {
  const baseUrl = getPhotoUrl(photoUrl);
  
  if (baseUrl.startsWith('data:') || baseUrl === NO_PHOTO_PLACEHOLDER) {
    return baseUrl;
  }
  
  if (baseUrl.includes('/api/media/proxy')) {
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality) params.set('q', quality.toString());
    
    const separator = baseUrl.includes('?') ? '&' : '?';
    const paramStr = params.toString();
    return paramStr ? `${baseUrl}${separator}${paramStr}` : baseUrl;
  }
  
  return baseUrl;
}
