import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Ad } from "@/types/ad";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

type Coordinates = { lat: number; lng: number };

type AdsMapProps = {
  ads: Ad[];
  center?: Coordinates;
  onMarkerClick?: (adId: string) => void;
  height?: number;
};

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

function getAdCoordinates(ad: Ad): Coordinates | null {
  if (ad.location?.coordinates && ad.location.coordinates.length === 2) {
    const [lng, lat] = ad.location.coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat: Number(lat), lng: Number(lng) };
    }
  }
  return null;
}

export default function AdsMap({ ads, center, onMarkerClick, height = 360 }: AdsMapProps) {
  const adsWithCoords = useMemo(
    () =>
      ads
        .map((ad) => ({ ad, coords: getAdCoordinates(ad) }))
        .filter((item) => item.coords !== null),
    [ads],
  );

  const mapCenter = useMemo(() => {
    if (center?.lat && center?.lng) {
      return center;
    }

    if (!adsWithCoords.length) {
      return { lat: 53.9, lng: 27.5667 }; // Минск по умолчанию
    }

    const sum = adsWithCoords.reduce(
      (acc, item) => {
        if (!item.coords) return acc;
        return {
          lat: acc.lat + item.coords.lat,
          lng: acc.lng + item.coords.lng,
        };
      },
      { lat: 0, lng: 0 },
    );

    return {
      lat: sum.lat / adsWithCoords.length,
      lng: sum.lng / adsWithCoords.length,
    };
  }, [adsWithCoords, center]);

  return (
    <div className="w-full" style={{ height }}>
      <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={12} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {adsWithCoords.map(({ ad, coords }) =>
          coords ? (
            <Marker
              key={ad._id}
              position={[coords.lat, coords.lng]}
              eventHandlers={{
                click: () => onMarkerClick?.(ad._id),
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <strong className="block">{ad.title}</strong>
                  {ad.price != null && <span className="text-sm text-muted-foreground">{ad.price} BYN</span>}
                  {ad.location?.address && (
                    <span className="block text-xs text-muted-foreground">{ad.location.address}</span>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null,
        )}
      </MapContainer>
    </div>
  );
}
