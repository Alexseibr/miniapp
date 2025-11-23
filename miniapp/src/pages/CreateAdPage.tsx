import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { fetchCategories } from '@/api/categories';
import { createAd, CreateAdPayload } from '@/api/ads';
import { CategoryNode } from '@/types';
import EmptyState from '@/widgets/EmptyState';
import { ArrowLeft, Camera, MapPin, Loader2 } from 'lucide-react';
import { useGeo } from '@/utils/geo';

export default function CreateAdPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const { coords, requestLocation, status: geoStatus } = useGeo();

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [subcategories, setSubcategories] = useState<CategoryNode[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup_only' | 'delivery_only' | 'delivery_and_pickup'>('pickup_only');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [useLocation, setUseLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    if (categoryId) {
      const category = categories.find((c) => c.slug === categoryId);
      setSelectedCategory(category || null);
      setSubcategories(category?.subcategories || []);
      setSubcategoryId('');
    }
  }, [categoryId, categories]);

  const addPhoto = () => {
    if (photoInput.trim() && !photos.includes(photoInput.trim())) {
      setPhotos([...photos, photoInput.trim()]);
      setPhotoInput('');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user?.telegramId) {
      setError('Требуется авторизация');
      return;
    }

    if (!title.trim() || !categoryId || !price) {
      setError('Заполните все обязательные поля');
      return;
    }

    if (subcategories.length > 0 && !subcategoryId) {
      setError('Выберите подкатегорию');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Укажите корректную цену');
      return;
    }

    const payload: CreateAdPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      subcategoryId: subcategoryId || categoryId,
      price: priceNum,
      currency: 'BYN',
      photos: photos.length > 0 ? photos : undefined,
      sellerTelegramId: user.telegramId,
      deliveryType,
    };

    if (deliveryType !== 'pickup_only') {
      const radiusNum = parseFloat(deliveryRadiusKm);
      if (!isNaN(radiusNum) && radiusNum > 0) {
        payload.deliveryRadiusKm = radiusNum;
      }
    }

    if (useLocation && coords) {
      payload.location = {
        lat: coords.lat,
        lng: coords.lng,
        geo: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat],
        },
      };
    }

    try {
      setSubmitting(true);
      const ad = await createAd(payload);
      navigate(`/ads/${ad._id}`);
    } catch (err: any) {
      console.error('Create ad error:', err);
      setError(err.message || 'Не удалось создать объявление');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container">
        <EmptyState
          title="Требуется авторизация"
          description="Откройте MiniApp из чата с ботом"
        />
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          className="secondary"
          style={{ width: 'auto', padding: '12px', borderRadius: 12 }}
          data-testid="button-back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Создать объявление</h1>
      </div>

      <form onSubmit={handleSubmit} data-testid="form-create-ad">
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Основная информация</h3>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="title" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Название <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="title"
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: iPhone 13 Pro 128GB"
              maxLength={120}
              required
              data-testid="input-title"
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              {title.length}/120
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="description" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Описание
            </label>
            <textarea
              id="description"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробное описание товара..."
              rows={4}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              data-testid="input-description"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="category" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Категория <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="category"
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              data-testid="select-category"
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {subcategories.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="subcategory" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Подкатегория <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                id="subcategory"
                className="input"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                required
                data-testid="select-subcategory"
              >
                <option value="">Выберите подкатегорию</option>
                {subcategories.map((sub) => (
                  <option key={sub.slug} value={sub.slug}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 0 }}>
            <label htmlFor="price" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Цена <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                id="price"
                type="number"
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                required
                style={{ flex: 1 }}
                data-testid="input-price"
              />
              <span style={{ fontWeight: 600, color: '#6b7280' }}>BYN</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Фотографии</h3>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                className="input"
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                placeholder="URL фотографии"
                style={{ flex: 1 }}
                data-testid="input-photo"
              />
              <button
                type="button"
                className="secondary"
                onClick={addPhoto}
                style={{ width: 'auto', padding: '12px 20px' }}
                data-testid="button-add-photo"
              >
                <Camera size={20} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Добавьте ссылки на фотографии товара
            </div>
          </div>

          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
              {photos.map((photo, index) => (
                <div key={index} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: '#f3f4f6' }}>
                  <img
                    src={photo}
                    alt={`Фото ${index + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    data-testid={`photo-${index}`}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(0, 0, 0, 0.6)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                    data-testid={`button-remove-photo-${index}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Доставка</h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Тип доставки</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="deliveryType"
                  value="pickup_only"
                  checked={deliveryType === 'pickup_only'}
                  onChange={(e) => setDeliveryType(e.target.value as any)}
                  data-testid="radio-pickup-only"
                />
                <span>Только самовывоз</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="deliveryType"
                  value="delivery_and_pickup"
                  checked={deliveryType === 'delivery_and_pickup'}
                  onChange={(e) => setDeliveryType(e.target.value as any)}
                  data-testid="radio-delivery-and-pickup"
                />
                <span>Доставка и самовывоз</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="deliveryType"
                  value="delivery_only"
                  checked={deliveryType === 'delivery_only'}
                  onChange={(e) => setDeliveryType(e.target.value as any)}
                  data-testid="radio-delivery-only"
                />
                <span>Только доставка</span>
              </label>
            </div>
          </div>

          {deliveryType !== 'pickup_only' && (
            <div>
              <label htmlFor="deliveryRadius" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Радиус доставки (км)
              </label>
              <input
                id="deliveryRadius"
                type="number"
                className="input"
                value={deliveryRadiusKm}
                onChange={(e) => setDeliveryRadiusKm(e.target.value)}
                placeholder="Например: 10"
                min="0"
                step="1"
                data-testid="input-delivery-radius"
              />
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Местоположение</h3>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useLocation}
              onChange={(e) => setUseLocation(e.target.checked)}
              data-testid="checkbox-use-location"
            />
            <span>Использовать мою геопозицию</span>
          </label>

          {useLocation && (
            <div>
              {!coords ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={requestLocation}
                  disabled={geoStatus === 'loading'}
                  data-testid="button-request-location"
                >
                  {geoStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Получаем координаты...
                    </>
                  ) : (
                    <>
                      <MapPin size={16} className="inline mr-2" />
                      Разрешить доступ к геопозиции
                    </>
                  )}
                </button>
              ) : (
                <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: 8, fontSize: 14 }}>
                  ✅ Геопозиция добавлена: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="card" style={{ marginBottom: 16, background: '#fee2e2', border: '1px solid #fca5a5' }}>
            <p style={{ color: '#991b1b', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          className="primary"
          disabled={submitting}
          data-testid="button-submit"
          style={{ marginBottom: 80 }}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Создаём объявление...
            </>
          ) : (
            'Создать объявление'
          )}
        </button>
      </form>
    </div>
  );
}
