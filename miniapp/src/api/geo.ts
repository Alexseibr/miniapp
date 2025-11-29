import http from './http';

export interface GeoResolveResponse {
  lat: number;
  lng: number;
  city: string | null;
  area: string | null;
  village: string | null;
  label: string;
  raw?: {
    display_name?: string;
    address?: Record<string, unknown>;
  };
}

export interface PresetLocation {
  city: string;
  label: string;
  lat: number;
  lng: number;
}

export async function resolveGeoLocation(lat: number, lng: number): Promise<GeoResolveResponse> {
  const response = await http.post('/api/geo/resolve', { lat, lng });
  return response.data;
}

export async function getPresetLocations(): Promise<{ items: PresetLocation[] }> {
  const response = await http.get('/api/geo/preset-locations');
  return response.data;
}
