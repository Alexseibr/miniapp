import { apiClient } from './apiClient';

export const geoApi = {
  reverseGeocode(params: { lat: number; lng: number }) {
    return apiClient.get('/geo/reverse', { params });
  },
  listRegions() {
    return apiClient.get('/geo/regions');
  },
  listCities(regionId?: string) {
    return apiClient.get('/geo/cities', { params: { regionId } });
  },
};
