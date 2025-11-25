import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { fetchCategories } from '@/api/categories';
import { createAd, CreateAdPayload } from '@/api/ads';
import { CategoryNode } from '@/types';
import EmptyState from '@/widgets/EmptyState';
import { ArrowLeft, Camera, MapPin, Loader2 } from 'lucide-react';
import { useGeo } from '@/utils/geo';
import { useCategorySuggestions } from '@/hooks/useCategorySuggestions';
import CategorySuggestionGallery from '@/components/CategorySuggestionGallery';
import ImageUploader from '@/components/ImageUploader';

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
  const [city, setCity] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup_only' | 'delivery_only' | 'delivery_and_pickup'>('pickup_only');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [useLocation, setUseLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingSubcategoryId, setPendingSubcategoryId] = useState<string | null>(null);

  const { suggestions, isLoading: suggestionsLoading, hasHighConfidence } = useCategorySuggestions(title, 500);

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
      const loadedSubcategories = category?.subcategories || [];
      setSubcategories(loadedSubcategories);
      
      if (pendingSubcategoryId) {
        const exists = loadedSubcategories.some(sub => sub.slug === pendingSubcategoryId);
        if (exists) {
          setSubcategoryId(pendingSubcategoryId);
        } else {
          setSubcategoryId('');
        }
        setPendingSubcategoryId(null);
      } else {
        setSubcategoryId('');
      }
    }
  }, [categoryId, categories, pendingSubcategoryId]);

  const addPhoto = () => {
    if (photoInput.trim() && !photos.includes(photoInput.trim())) {
      setPhotos([...photos, photoInput.trim()]);
      setPhotoInput('');
    }
  };

  const handlePhotoUpload = (url: string) => {
    if (!photos.includes(url)) {
      setPhotos([...photos, url]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSelectSuggestedCategory = (suggestion: any) => {
    const topLevelSlug = suggestion.topLevelParentSlug || suggestion.slug;
    
    if (suggestion.level === 1) {
      setCategoryId(topLevelSlug);
      setSubcategoryId('');
      setPendingSubcategoryId(null);
    } else {
      const subcatSlug = suggestion.directSubcategorySlug || suggestion.slug;
      setPendingSubcategoryId(subcatSlug);
      setCategoryId(topLevelSlug);
    }
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
      city: city.trim() || undefined,
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
    <div style={{ background: '#F9FAFB', minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ 
        background: '#fff', 
        borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
          data-testid="button-back"
        >
          <ArrowLeft size={24} color="#111827" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Подача объявления</h1>
      </div>

      <form onSubmit={handleSubmit} data-testid="form-create-ad" style={{ background: '#fff', padding: '16px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            marginBottom: 12,
            color: '#111827'
          }}>
            Фотографии
          </div>
          <div style={{ 
            fontSize: 13, 
            color: '#6B7280', 
            marginBottom: 12 
          }}>
            Загружено {photos.length} из 9
          </div>

          <div style={{ marginBottom: 12 }}>
            <ImageUploader onUpload={handlePhotoUpload} maxSizeMB={20} />
          </div>

          <div style={{ 
            background: '#ECFDF5', 
            border: '1px solid #A7F3D0',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            gap: 8,
            marginBottom: 12
          }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <span style={{ fontSize: 13, color: '#065F46', lineHeight: 1.5 }}>
              Качественные фотографии привлекают покупателей, а их количество увеличивает шансы на продажу
            </span>
          </div>

          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
            Название товара/услуги<span style={{ color: '#EF4444' }}>*</span>
          </div>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, телевизор Horizont"
            maxLength={50}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              borderBottom: '1px solid #E5E7EB',
              fontSize: 16,
              outline: 'none',
              fontFamily: 'inherit'
            }}
            data-testid="input-title"
          />
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            {title.length}/50
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
            Обязательное поле
          </div>
        </div>

        {title.length >= 3 && (
          <div style={{ marginBottom: 24 }}>
            <CategorySuggestionGallery
              suggestions={suggestions}
              isLoading={suggestionsLoading}
              onSelectCategory={handleSelectSuggestedCategory}
              hasHighConfidence={hasHighConfidence}
            />
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 400, color: '#111827', marginBottom: 8 }}>
            Категория<span style={{ color: '#EF4444' }}>*</span>
          </div>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #E5E7EB',
              fontSize: 16,
              outline: 'none',
              fontFamily: 'inherit',
              background: '#fff',
              borderRadius: 8
            }}
            data-testid="select-category"
          >
            <option value="">Выберите категорию</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
            Обязательное поле
          </div>

          {subcategories.length > 0 && (
            <>
              <div style={{ fontSize: 16, fontWeight: 400, color: '#111827', marginTop: 16, marginBottom: 8 }}>
                Подкатегория<span style={{ color: '#EF4444' }}>*</span>
              </div>
              <select
                id="subcategory"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E5E7EB',
                  fontSize: 16,
                  outline: 'none',
                  fontFamily: 'inherit',
                  background: '#fff',
                  borderRadius: 8
                }}
                data-testid="select-subcategory"
              >
                <option value="">Выберите подкатегорию</option>
                {subcategories.map((sub) => (
                  <option key={sub.slug} value={sub.slug}>
                    {sub.name}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
                Обязательное поле
              </div>
            </>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 400, color: '#111827', marginBottom: 8 }}>
            Описание
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>
            Обязательное поле
          </div>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Подробное описание товара..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            data-testid="input-description"
          />
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            {description.length}/4000
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setPrice('')}
              style={{
                flex: 1,
                padding: '12px',
                background: price === '' ? '#3B73FC' : '#F3F4F6',
                color: price === '' ? '#fff' : '#6B7280',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer'
              }}
              data-testid="button-price-type-paid"
            >
              Цена
            </button>
            <button
              type="button"
              onClick={() => setPrice('0')}
              style={{
                flex: 1,
                padding: '12px',
                background: price === '0' ? '#3B73FC' : '#F3F4F6',
                color: price === '0' ? '#fff' : '#6B7280',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer'
              }}
              data-testid="button-price-type-free"
            >
              Бесплатно
            </button>
          </div>
          {price !== '0' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Например: 0,99"
                min="0"
                step="0.01"
                required
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 16,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                data-testid="input-price"
              />
              <span style={{ fontSize: 14, color: '#6B7280', minWidth: 40 }}>р.</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => {}}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              textAlign: 'left'
            }}
            data-testid="button-select-city"
          >
            <MapPin size={20} color="#3B73FC" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 400, color: '#111827' }}>
                Город / Район
              </div>
            </div>
            <div style={{ fontSize: 14, color: city ? '#111827' : '#3B73FC' }}>
              {city || 'Брест'}
            </div>
          </button>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Город"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              fontSize: 16,
              outline: 'none',
              fontFamily: 'inherit',
              background: '#F9FAFB',
              borderRadius: 8,
              marginTop: 8
            }}
            data-testid="input-city"
          />
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
            Обязательное поле
          </div>
        </div>

        {error && (
          <div style={{ 
            marginBottom: 16, 
            background: '#FEE2E2', 
            border: '1px solid #FCA5A5',
            padding: 12,
            borderRadius: 8
          }}>
            <p style={{ color: '#991B1B', margin: 0, fontSize: 14 }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '14px',
            background: submitting ? '#9CA3AF' : '#3B73FC',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
          data-testid="button-submit"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
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
