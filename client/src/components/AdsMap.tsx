import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { FC } from "react";
import type { Ad } from "@/types/ad";

interface AdsMapProps {
  ads: Ad[];
  center: { lat: number; lng: number };
  onMarkerClick: (adId: string) => void;
}

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const AdsMap: FC<AdsMapProps> = ({ ads, center, onMarkerClick }) => {
  return (
    <div className="ads-map">
      <MapContainer center={[center.lat, center.lng]} zoom={12} scrollWheelZoom style={{ height: "400px" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {ads
          .filter((ad) => ad.location?.coordinates?.length === 2)
          .map((ad) => {
            const [lng, lat] = ad.location!.coordinates as [number, number];
            return (
              <Marker key={ad._id} position={[lat, lng]} eventHandlers={{ click: () => onMarkerClick(ad._id) }} icon={defaultIcon}>
                <Popup>
                  <div className="map-popup">
                    <strong>{ad.title}</strong>
                    {ad.price != null && <div>{ad.price} BYN</div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default AdsMap;
