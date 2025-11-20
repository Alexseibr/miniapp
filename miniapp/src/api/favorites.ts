import api from './axios';

export const toggleFavorite = (adId: string) => api.post('/favorites/toggle', { adId }).then((r) => r.data);

export const getFavorites = () => api.get('/favorites/my').then((r) => r.data);

// Convenience aliases used across the app
export const addFavorite = (adId: string) => toggleFavorite(adId);
export const removeFavorite = (adId: string) => toggleFavorite(adId);
export const fetchFavorites = () => getFavorites();
