import { useState, useEffect, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { fetchCategories } from '@/api/categories';
import { createAd, CreateAdPayload } from '@/api/ads';
import { resolveGeoLocation, getPresetLocations, PresetLocation } from '@/api/geo';
import { CategoryNode } from '@/types';
import { ArrowLeft, MapPin, Loader2, Camera, X, Check } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';

interface LocationData {
  lat: number;
  lng: number;
  geoLabel: string;
}

interface InfoData {
  title: string;
  categoryId: string;
  subcategoryId: string;
  price: string;
  description: string;
}

interface ContactsData {
  contactType: 'telegram_phone' | 'telegram_username' | 'instagram' | 'none';
  contactPhone: string;
  contactUsername: string;
  contactInstagram: string;
}

interface DraftAd {
  location: LocationData | null;
  photos: string[];
  info: InfoData;
  contacts: ContactsData;
}

type WizardAction =
  | { type: 'SET_LOCATION'; payload: LocationData }
  | { type: 'ADD_PHOTO'; payload: string }
  | { type: 'REMOVE_PHOTO'; payload: number }
  | { type: 'SET_INFO'; payload: Partial<InfoData> }
  | { type: 'SET_CONTACTS'; payload: Partial<ContactsData> };

const initialState: DraftAd = {
  location: null,
  photos: [],
  info: { title: '', categoryId: '', subcategoryId: '', price: '', description: '' },
  contacts: { contactType: 'none', contactPhone: '', contactUsername: '', contactInstagram: '' },
};

function draftReducer(state: DraftAd, action: WizardAction): DraftAd {
  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, location: action.payload };
    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.payload] };
    case 'REMOVE_PHOTO':
      return { ...state, photos: state.photos.filter((_, i) => i !== action.payload) };
    case 'SET_INFO':
      return { ...state, info: { ...state.info, ...action.payload } };
    case 'SET_CONTACTS':
      return { ...state, contacts: { ...state.contacts, ...action.payload } };
    default:
      return state;
  }
}

export default function CreateAdPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState(1);
  const [draft, dispatch] = useReducer(draftReducer, initialState);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (user?.phone) {
      dispatch({ type: 'SET_CONTACTS', payload: { contactType: 'telegram_phone', contactPhone: user.phone } });
    } else if (user?.username) {
      dispatch({ type: 'SET_CONTACTS', payload: { contactType: 'telegram_username', contactUsername: user.username } });
    }
  }, [user]);

  const canGoNext = () => {
    if (currentStep === 1) return !!draft.location;
    if (currentStep === 2) return true;
    if (currentStep === 3) return !!draft.info.title && !!draft.info.categoryId && !!draft.info.price && parseFloat(draft.info.price) > 0;
    if (currentStep === 4) {
      const hasContact = draft.contacts.contactPhone || draft.contacts.contactUsername || draft.contacts.contactInstagram;
      return !!hasContact;
    }
    return false;
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async () => {
    if (!user?.telegramId || !draft.location) {
      setError('Требуется авторизация и местоположение');
      return;
    }

    const subcategories = categories.find(c => c.slug === draft.info.categoryId)?.subcategories || [];
    const finalSubcategoryId = draft.info.subcategoryId || draft.info.categoryId;

    let finalContactType: 'telegram_phone' | 'telegram_username' | 'instagram' | 'none' = 'none';
    if (draft.contacts.contactPhone) {
      finalContactType = 'telegram_phone';
    } else if (draft.contacts.contactUsername) {
      finalContactType = 'telegram_username';
    } else if (draft.contacts.contactInstagram) {
      finalContactType = 'instagram';
    }

    if (finalContactType === 'none') {
      setError('Требуется хотя бы один способ связи');
      return;
    }

    const payload: CreateAdPayload = {
      title: draft.info.title.trim(),
      description: draft.info.description.trim() || undefined,
      categoryId: draft.info.categoryId,
      subcategoryId: finalSubcategoryId,
      price: parseFloat(draft.info.price),
      currency: 'BYN',
      photos: draft.photos.length > 0 ? draft.photos : undefined,
      sellerTelegramId: user.telegramId,
      geoLabel: draft.location.geoLabel,
      location: {
        lat: draft.location.lat,
        lng: draft.location.lng,
        geo: {
          type: 'Point',
          coordinates: [draft.location.lng, draft.location.lat],
        },
      },
      contactType: finalContactType,
      contactPhone: draft.contacts.contactPhone || undefined,
      contactUsername: draft.contacts.contactUsername || undefined,
      contactInstagram: draft.contacts.contactInstagram || undefined,
    };

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

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={handleBack} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }} data-testid="button-back">
            <ArrowLeft size={24} color="#111827" />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Подача объявления</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4].map((step) => (
            <div key={step} style={{ flex: 1, height: 4, borderRadius: 2, background: step <= currentStep ? '#3B73FC' : '#E5E7EB' }} />
          ))}
        </div>
      </div>

      {currentStep === 1 && <Step1Location location={draft.location} onSetLocation={(loc) => dispatch({ type: 'SET_LOCATION', payload: loc })} />}
      {currentStep === 2 && <Step2Photos photos={draft.photos} onAddPhoto={(url) => dispatch({ type: 'ADD_PHOTO', payload: url })} onRemovePhoto={(idx) => dispatch({ type: 'REMOVE_PHOTO', payload: idx })} />}
      {currentStep === 3 && <Step3Info info={draft.info} categories={categories} onSetInfo={(info) => dispatch({ type: 'SET_INFO', payload: info })} />}
      {currentStep === 4 && <Step4Contacts contacts={draft.contacts} user={user} onSetContacts={(contacts) => dispatch({ type: 'SET_CONTACTS', payload: contacts })} />}

      {error && (
        <div style={{ margin: '16px', background: '#FEE2E2', border: '1px solid #FCA5A5', padding: 12, borderRadius: 8 }}>
          <p style={{ color: '#991B1B', margin: 0, fontSize: 14 }}>{error}</p>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #E5E7EB', padding: 16, display: 'flex', gap: 12 }}>
        <button
          onClick={handleNext}
          disabled={!canGoNext() || submitting}
          style={{
            flex: 1,
            padding: '16px',
            background: (!canGoNext() || submitting) ? '#9CA3AF' : '#3B73FC',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 17,
            fontWeight: 600,
            cursor: (!canGoNext() || submitting) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          data-testid="button-next"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Создаём...
            </>
          ) : currentStep === 4 ? (
            'Опубликовать'
          ) : (
            'Далее'
          )}
        </button>
      </div>
    </div>
  );
}

function Step1Location({ location, onSetLocation }: { location: LocationData | null; onSetLocation: (loc: LocationData) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [presets, setPresets] = useState<PresetLocation[]>([]);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    getPresetLocations().then((res) => setPresets(res.items)).catch(console.error);
  }, []);

  const handleAutoDetect = async () => {
    setError('');
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });

      const { latitude, longitude } = pos.coords;
      const result = await resolveGeoLocation(latitude, longitude);
      onSetLocation({ lat: result.lat, lng: result.lng, geoLabel: result.label });
    } catch (err: any) {
      console.error('Geo error:', err);
      setError('Не удалось определить местоположение');
      setShowPresets(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetLocation) => {
    onSetLocation({ lat: preset.lat, lng: preset.lng, geoLabel: preset.label });
    setShowPresets(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 12px', color: '#111827', textAlign: 'center' }}>
        Где вы продаёте?
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', margin: '0 0 32px' }}>
        Мы определим район или деревню, где вы сейчас находитесь
      </p>

      {!location && !showPresets && (
        <button
          onClick={handleAutoDetect}
          disabled={loading}
          style={{
            width: '100%',
            padding: '20px',
            background: loading ? '#9CA3AF' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 18,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
          data-testid="button-auto-detect"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <MapPin size={24} />}
          {loading ? 'Определяем...' : '📍 Определить автоматически'}
        </button>
      )}

      {location && (
        <div style={{ background: '#ECFDF5', border: '2px solid #10b981', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <Check size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, color: '#065F46', marginBottom: 8 }}>Ваше местоположение:</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#047857' }}>{location.geoLabel}</div>
          <button
            onClick={() => { onSetLocation(null as any); setShowPresets(true); }}
            style={{ marginTop: 16, background: 'none', border: '1px solid #10b981', color: '#10b981', padding: '10px 20px', borderRadius: 8, fontSize: 15, cursor: 'pointer' }}
          >
            Выбрать другое
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, background: '#FEE2E2', border: '1px solid #FCA5A5', padding: 12, borderRadius: 8, fontSize: 14, color: '#991B1B' }}>
          {error}
        </div>
      )}

      {showPresets && !location && presets.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#111827' }}>Выберите город:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {presets.map((preset) => (
              <button
                key={preset.city}
                onClick={() => handleSelectPreset(preset)}
                style={{
                  padding: '16px',
                  background: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 16,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                data-testid={`button-preset-${preset.city.toLowerCase()}`}
              >
                <MapPin size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Step2Photos({ photos, onAddPhoto, onRemovePhoto }: { photos: string[]; onAddPhoto: (url: string) => void; onRemovePhoto: (idx: number) => void }) {
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [error, setError] = useState('');
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  const handleFileSelect = async (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 4) {
      e.target.value = '';
      return;
    }

    setError('');
    setUploadingSlot(slotIndex);

    try {
      const maxBytes = 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        setError('Файл слишком большой. Максимум 10MB');
        setUploadingSlot(null);
        e.target.value = '';
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Выберите изображение');
        setUploadingSlot(null);
        e.target.value = '';
        return;
      }

      const extension = file.name.split('.').pop() || 'jpg';
      const response = await fetch('/api/uploads/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileExtension: extension }),
      });

      if (!response.ok) throw new Error('Ошибка получения URL загрузки');

      const { uploadURL, publicURL } = await response.json();

      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) throw new Error('Ошибка загрузки файла');

      onAddPhoto(publicURL);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setUploadingSlot(null);
      e.target.value = '';
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', color: '#111827' }}>
        Фото товара
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 24 }}>
        До 4 фотографий (необязательно)
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} style={{ position: 'relative', aspectRatio: '1', background: photos[idx] ? 'transparent' : '#F3F4F6', borderRadius: 12, overflow: 'hidden', border: photos[idx] ? 'none' : '2px dashed #D1D5DB' }}>
            {photos[idx] ? (
              <>
                <img src={photos[idx]} alt={`Фото ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} data-testid={`photo-${idx}`} />
                <button
                  onClick={() => onRemovePhoto(idx)}
                  disabled={uploadingSlot === idx}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  data-testid={`button-remove-photo-${idx}`}
                >
                  <X size={18} />
                </button>
              </>
            ) : uploadingSlot === idx ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={32} color="#3B73FC" className="animate-spin" />
                <span style={{ fontSize: 13, color: '#3B73FC', marginTop: 8 }}>Загрузка...</span>
              </div>
            ) : (
              <button
                onClick={() => fileInputRefs.current[idx]?.click()}
                disabled={photos.length >= 4 || uploadingSlot !== null}
                style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: (photos.length >= 4 || uploadingSlot !== null) ? 'not-allowed' : 'pointer', opacity: (photos.length >= 4 || uploadingSlot !== null) ? 0.5 : 1 }}
                data-testid={`button-add-photo-${idx}`}
              >
                <Camera size={32} color="#9CA3AF" />
                <span style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>Добавить</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {[0, 1, 2, 3].map((idx) => (
        <input
          key={idx}
          ref={(el) => (fileInputRefs.current[idx] = el)}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileSelect(idx, e)}
          style={{ display: 'none' }}
        />
      ))}

      {error && (
        <div style={{ marginTop: 16, background: '#FEE2E2', border: '1px solid #FCA5A5', padding: 12, borderRadius: 8, fontSize: 14, color: '#991B1B' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, background: '#EBF3FF', border: '1px solid #3B73FC', borderRadius: 8, fontSize: 14, color: '#1E40AF' }}>
        ⚡ Качественные фотографии помогают быстрее продать товар
      </div>
    </div>
  );
}

function Step3Info({ info, categories, onSetInfo }: { info: InfoData; categories: CategoryNode[]; onSetInfo: (info: Partial<InfoData>) => void }) {
  const selectedCategory = categories.find(c => c.slug === info.categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 24px', color: '#111827' }}>
        Информация о товаре
      </h2>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 15, fontWeight: 500, marginBottom: 8, color: '#111827' }}>
          Что продаёте?<span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          type="text"
          value={info.title}
          onChange={(e) => onSetInfo({ title: e.target.value })}
          placeholder="Например, картошка, клубника"
          maxLength={50}
          style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }}
          data-testid="input-title"
        />
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{info.title.length}/50</div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 15, fontWeight: 500, marginBottom: 8, color: '#111827' }}>
          Категория<span style={{ color: '#EF4444' }}>*</span>
        </label>
        <select
          value={info.categoryId}
          onChange={(e) => onSetInfo({ categoryId: e.target.value, subcategoryId: '' })}
          style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 16, background: '#fff', fontFamily: 'inherit' }}
          data-testid="select-category"
        >
          <option value="">Выберите категорию</option>
          {categories.map((cat) => (<option key={cat.slug} value={cat.slug}>{cat.name}</option>))}
        </select>
      </div>

      {subcategories.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 15, fontWeight: 500, marginBottom: 8, color: '#111827' }}>Подкатегория</label>
          <select
            value={info.subcategoryId}
            onChange={(e) => onSetInfo({ subcategoryId: e.target.value })}
            style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 16, background: '#fff', fontFamily: 'inherit' }}
            data-testid="select-subcategory"
          >
            <option value="">Не выбрано</option>
            {subcategories.map((sub) => (<option key={sub.slug} value={sub.slug}>{sub.name}</option>))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 15, fontWeight: 500, marginBottom: 8, color: '#111827' }}>
          Цена<span style={{ color: '#EF4444' }}>*</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            value={info.price}
            onChange={(e) => onSetInfo({ price: e.target.value })}
            placeholder="10.00"
            min="0"
            step="0.01"
            style={{ flex: 1, padding: '14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }}
            data-testid="input-price"
          />
          <span style={{ fontSize: 16, fontWeight: 500, color: '#6B7280' }}>BYN</span>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 15, fontWeight: 500, marginBottom: 8, color: '#111827' }}>Описание (по желанию)</label>
        <textarea
          value={info.description}
          onChange={(e) => onSetInfo({ description: e.target.value })}
          placeholder="Подробное описание товара..."
          rows={4}
          maxLength={500}
          style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', resize: 'vertical' }}
          data-testid="input-description"
        />
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{info.description.length}/500</div>
      </div>
    </div>
  );
}

function Step4Contacts({ contacts, user, onSetContacts }: { contacts: ContactsData; user: any; onSetContacts: (contacts: Partial<ContactsData>) => void }) {
  const hasPhone = !!user?.phone;
  const hasUsername = !!user?.username;

  useEffect(() => {
    if (hasPhone && !contacts.contactPhone) {
      onSetContacts({ contactType: 'telegram_phone', contactPhone: user.phone });
    } else if (hasUsername && !contacts.contactUsername) {
      onSetContacts({ contactType: 'telegram_username', contactUsername: user.username });
    }
  }, [hasPhone, hasUsername]);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 12px', color: '#111827' }}>
        Как с вами свяжутся?
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 24 }}>
        Укажите удобный способ связи
      </p>

      {hasPhone && (
        <button
          onClick={() => onSetContacts({ contactType: 'telegram_phone', contactPhone: user.phone })}
          style={{
            width: '100%',
            padding: '16px',
            marginBottom: 12,
            background: contacts.contactType === 'telegram_phone' ? '#EBF3FF' : '#fff',
            border: `2px solid ${contacts.contactType === 'telegram_phone' ? '#3B73FC' : '#E5E7EB'}`,
            borderRadius: 12,
            fontSize: 16,
            textAlign: 'left',
            cursor: 'pointer',
          }}
          data-testid="button-contact-phone"
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Телефон из Telegram</div>
          <div style={{ color: '#6B7280' }}>{user.phone}</div>
        </button>
      )}

      {hasUsername && (
        <button
          onClick={() => onSetContacts({ contactType: 'telegram_username', contactUsername: user.username })}
          style={{
            width: '100%',
            padding: '16px',
            marginBottom: 12,
            background: contacts.contactType === 'telegram_username' ? '#EBF3FF' : '#fff',
            border: `2px solid ${contacts.contactType === 'telegram_username' ? '#3B73FC' : '#E5E7EB'}`,
            borderRadius: 12,
            fontSize: 16,
            textAlign: 'left',
            cursor: 'pointer',
          }}
          data-testid="button-contact-username"
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Telegram</div>
          <div style={{ color: '#6B7280' }}>@{user.username}</div>
        </button>
      )}

      {!hasPhone && !hasUsername && (
        <div style={{ marginBottom: 20, padding: 16, background: '#FEF3C7', border: '1px solid #FDE047', borderRadius: 8 }}>
          <div style={{ fontSize: 15, color: '#92400E', marginBottom: 8 }}>
            В вашем Telegram-профиле не указан номер или имя пользователя
          </div>
          <div style={{ fontSize: 14, color: '#A16207' }}>
            Рекомендуем добавить их в настройках Telegram для удобства покупателей
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <label style={{ display: 'block', fontSize: 15, fontWeight: 500, marginBottom: 8, color: '#111827' }}>
          Instagram (по желанию)
        </label>
        <input
          type="text"
          value={contacts.contactInstagram}
          onChange={(e) => {
            const val = e.target.value;
            onSetContacts({ contactInstagram: val });
            if (val && !hasPhone && !hasUsername) {
              onSetContacts({ contactType: 'instagram' });
            }
          }}
          placeholder="@ваш_аккаунт"
          style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }}
          data-testid="input-instagram"
        />
      </div>
    </div>
  );
}
