import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import type { FC } from "react";
import type { Ad } from "@/types/ad";

interface AdCardProps {
  ad: Ad;
  isFavorite: boolean;
  onToggleFavorite: (adId: string) => void;
}

const AdCard: FC<AdCardProps> = ({ ad, isFavorite, onToggleFavorite }) => {
  const navigate = useNavigate();
  const previewImage = ad.images?.[0] || ad.photos?.[0];

  const handleCardClick = () => {
    navigate(`/ads/${ad._id}`);
  };

  const handleFavoriteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleFavorite(ad._id);
  };

  return (
    <div className="ad-card" onClick={handleCardClick} role="button" tabIndex={0}>
      <div className="ad-card__image">
        {previewImage ? (
          <img src={previewImage} alt={ad.title} />
        ) : (
          <div className="ad-card__placeholder">Нет фото</div>
        )}
        <button
          className={`ad-card__favorite ${isFavorite ? "ad-card__favorite--active" : ""}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
        >
          <Heart className={isFavorite ? "filled" : ""} />
        </button>
      </div>
      <div className="ad-card__body">
        <h3 className="ad-card__title">{ad.title}</h3>
        {ad.price != null && <p className="ad-card__price">{ad.price} BYN</p>}
        {ad.location?.address && <p className="ad-card__meta">{ad.location.address}</p>}
      </div>
    </div>
  );
};

export default AdCard;
