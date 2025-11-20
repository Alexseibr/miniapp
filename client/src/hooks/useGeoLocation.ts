import { useCallback, useState } from "react";

type GeoCoords = {
  lat: number;
  lng: number;
};

type GeoState = {
  coords: GeoCoords | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<GeoCoords>;
};

export function useGeoLocation(): GeoState {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    return new Promise<GeoCoords>((resolve, reject) => {
      if (!navigator.geolocation) {
        const message = "Браузер не поддерживает геолокацию";
        setError(message);
        reject(new Error(message));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(nextCoords);
          setLoading(false);
          resolve(nextCoords);
        },
        (geoError) => {
          const message = geoError?.message || "Не удалось определить местоположение";
          setError(message);
          setLoading(false);
          reject(new Error(message));
        },
      );
    });
  }, []);

  return { coords, loading, error, requestLocation };
}

export default useGeoLocation;
