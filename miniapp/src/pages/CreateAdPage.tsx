import { useState, useEffect, useReducer, useRef } from 'react';
import { useLocation } from 'wouter';
import { useUserStore } from '@/store/useUserStore';
import { fetchCategories } from '@/api/categories';
import { createAd, CreateAdPayload } from '@/api/ads';
import { resolveGeoLocation, getPresetLocations, PresetLocation } from '@/api/geo';
import { CategoryNode } from '@/types';
import { ArrowLeft, MapPin, Loader2, Camera, X, Check, RefreshCw, Edit3, Info, Bell } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import PriceHint from '@/components/PriceHint';
import { SchedulePublishBlock } from '@/components/schedule/SchedulePublishBlock';

const BRAND_BLUE = '#2B5CFF';
const BRAND_BLUE_LIGHT = 'rgba(43, 92, 255, 0.12)';
const BRAND_BLUE_BORDER = 'rgba(43, 92, 255, 0.4)';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface AdPhoto {
  id: string;
  localPreviewUrl: string;
  file: File | null;
  uploadStatus: UploadStatus;
  remoteUrl?: string;
  isMain?: boolean;
}

const MAX_PHOTOS = 4;

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
  photos: AdPhoto[];
  info: InfoData;
  contacts: ContactsData;
  publishAt: Date | null;
}

type WizardAction =
  | { type: 'SET_LOCATION'; payload: LocationData }
  | { type: 'ADD_PHOTO'; payload: AdPhoto }
  | { type: 'REMOVE_PHOTO'; payload: string }
  | { type: 'SET_PHOTOS'; payload: AdPhoto[] }
  | { type: 'UPDATE_PHOTO'; payload: { id: string; updates: Partial<AdPhoto> } }
  | { type: 'SET_INFO'; payload: Partial<InfoData> }
  | { type: 'SET_CONTACTS'; payload: Partial<ContactsData> }
  | { type: 'SET_PUBLISH_AT'; payload: Date | null };

const initialState: DraftAd = {
  location: null,
  photos: [],
  info: { title: '', categoryId: '', subcategoryId: '', price: '', description: '' },
  contacts: { contactType: 'none', contactPhone: '', contactUsername: '', contactInstagram: '' },
  publishAt: null,
};

function draftReducer(state: DraftAd, action: WizardAction): DraftAd {
  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, location: action.payload };
    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.payload] };
    case 'REMOVE_PHOTO':
      return { ...state, photos: state.photos.filter((p) => p.id !== action.payload) };
    case 'SET_PHOTOS':
      return { ...state, photos: action.payload };
    case 'UPDATE_PHOTO':
      return { ...state, photos: state.photos.map(p => p.id === action.payload.id ? { ...p, ...action.payload.updates } : p) };
    case 'SET_INFO':
      return { ...state, info: { ...state.info, ...action.payload } };
    case 'SET_CONTACTS':
      return { ...state, contacts: { ...state.contacts, ...action.payload } };
    case 'SET_PUBLISH_AT':
      return { ...state, publishAt: action.payload };
    default:
      return state;
  }
}

export default function CreateAdPage() {
  const [, setLocation] = useLocation();
  const user = useUserStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState(1);
  const [draft, dispatch] = useReducer(draftReducer, initialState);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photoStepResetKey, setPhotoStepResetKey] = useState(0);

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
    if (currentStep === 2) {
      const isAnyUploading = draft.photos.some(p => p.uploadStatus === 'uploading');
      return !isAnyUploading;
    }
    if (currentStep === 3) return !!draft.info.title && !!draft.info.categoryId && !!draft.info.price && parseFloat(draft.info.price) > 0;
    if (currentStep === 4) {
      const hasContact = draft.contacts.contactPhone || draft.contacts.contactUsername || draft.contacts.contactInstagram;
      return !!hasContact;
    }
    if (currentStep === 5) return true;
    return false;
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      window.history.back();
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

    const uploadedPhotoUrls = draft.photos
      .filter(p => p.uploadStatus === 'done' && p.remoteUrl)
      .map(p => p.remoteUrl as string);

    const payload: CreateAdPayload = {
      title: draft.info.title.trim(),
      description: draft.info.description.trim() || undefined,
      categoryId: draft.info.categoryId,
      subcategoryId: finalSubcategoryId,
      price: parseFloat(draft.info.price),
      currency: 'RUB',
      photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined,
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
      publishAt: draft.publishAt ? draft.publishAt.toISOString() : undefined,
    };

    try {
      setSubmitting(true);
      const ad = await createAd(payload);
      setLocation(`/ads/${ad._id}`);
    } catch (err: any) {
      console.error('Create ad error:', err);
      setError(err.message || 'Не удалось создать объявление');
    } finally {
      setSubmitting(false);
    }
  };

  const [, navigate] = useLocation();

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', paddingBottom: 160 }}>
      {/* Main sticky header with KETMAR - prevents MiniApp from closing on scroll */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          zIndex: 100,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#1F2937',
            letterSpacing: '-0.5px',
          }}
        >
          KETMAR
        </h1>
        <button
          onClick={() => navigate('/notifications')}
          data-testid="button-notifications-header"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background: '#F5F6F8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Bell size={20} color="#6B7280" />
        </button>
      </header>

      {/* Step header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={handleBack} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }} data-testid="button-back">
            <ArrowLeft size={24} color="#111827" />
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Подача объявления</h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} style={{ flex: 1, height: 4, borderRadius: 2, background: step <= currentStep ? BRAND_BLUE : '#E5E7EB' }} />
          ))}
        </div>
      </div>

      {currentStep === 1 && (
        <Step1Location
          location={draft.location}
          onSetLocation={(loc) => dispatch({ type: 'SET_LOCATION', payload: loc })}
          onComplete={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 2 && (
        <Step2Photos
          key={photoStepResetKey}
          photos={draft.photos}
          onAddPhoto={(photo) => dispatch({ type: 'ADD_PHOTO', payload: photo })}
          onRemovePhoto={(id) => dispatch({ type: 'REMOVE_PHOTO', payload: id })}
          onUpdatePhoto={(id, updates) => dispatch({ type: 'UPDATE_PHOTO', payload: { id, updates } })}
        />
      )}
      {currentStep === 3 && <Step3Info info={draft.info} categories={categories} onSetInfo={(info) => dispatch({ type: 'SET_INFO', payload: info })} city={draft.location?.geoLabel?.split(' ')[0]} noPhotos={draft.photos.length === 0} onGoToPhotos={() => { setPhotoStepResetKey(k => k + 1); setCurrentStep(2); }} />}
      {currentStep === 4 && (
        <Step4Contacts
          contacts={draft.contacts}
          user={user}
          onSetContacts={(contacts) => dispatch({ type: 'SET_CONTACTS', payload: contacts })}
          publishAt={draft.publishAt}
          onSetPublishAt={(date) => dispatch({ type: 'SET_PUBLISH_AT', payload: date })}
        />
      )}
      {currentStep === 5 && (
        <Step5Confirm
          draft={draft}
          categories={categories}
          onEdit={(step) => setCurrentStep(step)}
        />
      )}

      {error && (
        <div style={{ margin: '16px', background: '#FEE2E2', border: '1px solid #FCA5A5', padding: 12, borderRadius: 8 }}>
          <p style={{ color: '#991B1B', margin: 0, fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Fixed button above bottom navbar */}
      <div style={{ 
        position: 'fixed', 
        bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))', 
        left: 0, 
        right: 0, 
        background: '#fff', 
        borderTop: '1px solid #E5E7EB', 
        padding: '12px 16px', 
        display: 'flex', 
        gap: 12,
        zIndex: 90,
      }}>
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
          ) : currentStep === 5 ? (
            'Опубликовать'
          ) : currentStep === 4 ? (
            'Проверить и отправить'
          ) : (
            'Далее'
          )}
        </button>
      </div>
    </div>
  );
}

function Step1Location({
  location,
  onSetLocation,
  onComplete,
}: {
  location: LocationData | null;
  onSetLocation: (loc: LocationData) => void;
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [presets, setPresets] = useState<PresetLocation[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [manualDistrict, setManualDistrict] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    getPresetLocations().then((res) => setPresets(res.items)).catch(console.error);
  }, []);

  const handleAutoDetect = async () => {
    setError('');
    setLoading(true);
    
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается вашим браузером');
      setShowPresets(true);
      setLoading(false);
      return;
    }
    
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve, 
          (err) => {
            console.error('Geolocation error:', err.code, err.message);
            reject(err);
          }, 
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      });

      const { latitude, longitude } = pos.coords;
      
      try {
        const result = await resolveGeoLocation(latitude, longitude);
        onSetLocation({ lat: result.lat, lng: result.lng, geoLabel: result.label });
      } catch (geoErr: any) {
        console.error('Reverse geocoding error:', geoErr);
        const fallbackLabel = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        onSetLocation({ lat: latitude, lng: longitude, geoLabel: fallbackLabel });
        setError('Не удалось определить адрес. Пожалуйста, выберите город из списка.');
        setShowPresets(true);
      }
    } catch (err: any) {
      console.error('Geo error:', err);
      let errorMessage = 'Не удалось определить местоположение. ';
      if (err.code === 1) {
        errorMessage += 'Доступ к геолокации запрещён.';
      } else if (err.code === 2) {
        errorMessage += 'Позиция недоступна.';
      } else if (err.code === 3) {
        errorMessage += 'Превышено время ожидания.';
      }
      setError(errorMessage);
      setShowPresets(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetLocation) => {
    onSetLocation({ lat: preset.lat, lng: preset.lng, geoLabel: preset.label });
    setShowPresets(false);
    setShowManualInput(false);
    setError('');
  };

  const handleChooseOther = () => {
    setShowPresets(true);
  };

  const handleManualSubmit = () => {
    const cityTrimmed = manualCity.trim();
    if (!cityTrimmed) {
      setError('Укажите город');
      return;
    }
    
    const preset = presets.find(p => 
      p.city.toLowerCase() === cityTrimmed.toLowerCase() ||
      p.label.toLowerCase().includes(cityTrimmed.toLowerCase())
    );
    
    if (!preset) {
      setError('Город не найден в списке. Пожалуйста, выберите город из предложенных вариантов.');
      return;
    }
    
    const labelParts = [cityTrimmed];
    if (manualDistrict.trim()) {
      labelParts.push(manualDistrict.trim());
    }
    
    onSetLocation({ lat: preset.lat, lng: preset.lng, geoLabel: labelParts.join(', ') });
    setShowManualInput(false);
    setError('');
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', color: '#111827', textAlign: 'center' }}>
        Где вы продаёте?
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', margin: '0 0 20px' }}>
        Укажите город и район для вашего объявления
      </p>

      {!location && !showPresets && !showManualInput && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleAutoDetect}
            disabled={loading}
            style={{
              width: '100%',
              padding: '18px',
              background: loading ? '#9CA3AF' : BRAND_BLUE,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              minHeight: 56,
            }}
            data-testid="button-auto-detect"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <MapPin size={22} />}
            {loading ? 'Определяем...' : 'Определить автоматически'}
          </button>
          
          <button
            onClick={() => setShowPresets(true)}
            style={{
              width: '100%',
              padding: '14px',
              background: '#fff',
              color: BRAND_BLUE,
              border: `1px solid ${BRAND_BLUE}`,
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            data-testid="button-select-city"
          >
            Выбрать город из списка
          </button>
        </div>
      )}

      {location && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={onComplete}
            style={{ 
              width: '100%',
              background: '#EBF3FF', 
              border: `2px solid ${BRAND_BLUE}`, 
              borderRadius: 12, 
              padding: 20, 
              textAlign: 'center',
              marginBottom: 16,
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            data-testid="button-confirm-location"
          >
            <div style={{ 
              width: 56, 
              height: 56, 
              background: BRAND_BLUE, 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <Check size={28} color="#fff" />
            </div>
            <div style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Ваше местоположение:</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: BRAND_BLUE }}>{location.geoLabel}</div>
            <div style={{ 
              marginTop: 12, 
              padding: '10px 16px', 
              background: BRAND_BLUE, 
              color: '#fff', 
              borderRadius: 8, 
              fontSize: 15, 
              fontWeight: 600,
              display: 'inline-block',
            }}>
              Подтвердить и продолжить →
            </div>
          </button>

          <button
            onClick={handleChooseOther}
            style={{
              width: '100%',
              background: 'transparent',
              border: `1px solid ${BRAND_BLUE}`,
              color: BRAND_BLUE,
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            data-testid="button-choose-other"
          >
            <RefreshCw size={18} />
            Выбрать другое место
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, marginBottom: 16, background: '#FEF3C7', border: '1px solid #F59E0B', padding: 12, borderRadius: 8, fontSize: 14, color: '#92400E' }}>
          {error}
        </div>
      )}

      {showManualInput && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
            Введите город и район вручную:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 6, fontWeight: 500 }}>
                Город *
              </label>
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="Например: Брест"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 10,
                  fontSize: 16,
                  outline: 'none',
                }}
                data-testid="input-manual-city"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 6, fontWeight: 500 }}>
                Район (необязательно)
              </label>
              <input
                type="text"
                value={manualDistrict}
                onChange={(e) => setManualDistrict(e.target.value)}
                placeholder="Например: Московский район"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 10,
                  fontSize: 16,
                  outline: 'none',
                }}
                data-testid="input-manual-district"
              />
            </div>
            <button
              onClick={handleManualSubmit}
              style={{
                width: '100%',
                padding: '14px',
                background: BRAND_BLUE,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              data-testid="button-manual-submit"
            >
              Подтвердить
            </button>
            <button
              onClick={() => { setShowManualInput(false); setShowPresets(true); }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: '#6B7280',
                border: 'none',
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Назад к списку городов
            </button>
          </div>
        </div>
      )}

      {showPresets && !showManualInput && presets.length > 0 && (
        <div style={{ marginTop: location ? 0 : 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
            {location ? 'Или выберите город:' : 'Выберите город:'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {presets.map((preset) => (
              <button
                key={preset.city}
                onClick={() => handleSelectPreset(preset)}
                style={{
                  padding: '14px 16px',
                  background: location?.geoLabel === preset.label ? '#EBF3FF' : '#fff',
                  border: location?.geoLabel === preset.label ? `2px solid ${BRAND_BLUE}` : '1px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: 16,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                data-testid={`button-preset-${preset.city.toLowerCase()}`}
              >
                <MapPin size={20} color={location?.geoLabel === preset.label ? BRAND_BLUE : '#6B7280'} />
                <span style={{ color: location?.geoLabel === preset.label ? BRAND_BLUE : '#111827', fontWeight: location?.geoLabel === preset.label ? 600 : 400 }}>
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowManualInput(true)}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '12px 16px',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            data-testid="button-manual-input"
          >
            <Edit3 size={18} />
            Ввести город вручную
          </button>
          
          {!location && (
            <button
              onClick={handleAutoDetect}
              disabled={loading}
              style={{
                marginTop: 12,
                width: '100%',
                background: 'transparent',
                border: `1px solid ${BRAND_BLUE}`,
                color: BRAND_BLUE,
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin size={18} />}
              {loading ? 'Определяем...' : 'Или определить автоматически'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Step2Photos({ 
  photos, 
  onAddPhoto, 
  onRemovePhoto, 
  onUpdatePhoto,
}: { 
  photos: AdPhoto[]; 
  onAddPhoto: (photo: AdPhoto) => void; 
  onRemovePhoto: (id: string) => void; 
  onUpdatePhoto: (id: string, updates: Partial<AdPhoto>) => void;
}) {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [error, setError] = useState('');
  
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenActionSheet = () => {
    if (photos.length >= MAX_PHOTOS) return;
    setShowActionSheet(true);
  };

  const handleSourceSelect = (source: 'camera' | 'gallery') => {
    setShowActionSheet(false);
    if (source === 'camera') {
      cameraInputRef.current?.click();
    } else {
      galleryInputRef.current?.click();
    }
  };

  const uploadSinglePhoto = async (photo: AdPhoto): Promise<void> => {
    if (!photo.file) return;
    
    onUpdatePhoto(photo.id, { uploadStatus: 'uploading' });
    
    try {
      const extension = photo.file.name.split('.').pop() || 'jpg';
      const initData = window.Telegram?.WebApp?.initData;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
      }
      
      const response = await fetch('/api/uploads/presigned-url', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fileExtension: extension }),
      });

      if (!response.ok) {
        throw new Error('upload_url_failed');
      }

      const { uploadURL, publicURL } = await response.json();
      
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: photo.file,
        headers: { 'Content-Type': photo.file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('upload_failed');
      }

      onUpdatePhoto(photo.id, { uploadStatus: 'done', remoteUrl: publicURL });
    } catch (err) {
      console.error('Upload error:', err);
      onUpdatePhoto(photo.id, { uploadStatus: 'error' });
    }
  };

  const handleRetryUpload = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
      await uploadSinglePhoto(photo);
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setError('');
    const freeSlots = MAX_PHOTOS - photos.length;
    const filesToProcess = Array.from(files).slice(0, freeSlots);
    
    const validFiles: File[] = [];
    for (const file of filesToProcess) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Некоторые файлы слишком большие (максимум 10MB)');
        continue;
      }
      if (!file.type.startsWith('image/')) {
        continue;
      }
      validFiles.push(file);
    }
    
    if (validFiles.length === 0) return;
    
    const timestamp = Date.now();
    const newPhotos: AdPhoto[] = validFiles.map((file, idx) => ({
      id: `photo-${timestamp}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      localPreviewUrl: URL.createObjectURL(file),
      file,
      uploadStatus: 'idle' as UploadStatus,
      isMain: photos.length === 0 && idx === 0,
    }));
    
    for (const photo of newPhotos) {
      onAddPhoto(photo);
    }
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    await Promise.all(newPhotos.map(photo => uploadSinglePhoto(photo)));
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(e.target.files);
    e.target.value = '';
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(e.target.files);
    e.target.value = '';
  };

  const handleRemovePhoto = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
      URL.revokeObjectURL(photo.localPreviewUrl);
      onRemovePhoto(photoId);
    }
  };

  const isAnyUploading = photos.some(p => p.uploadStatus === 'uploading');
  const hasErrors = photos.some(p => p.uploadStatus === 'error');

  return (
    <div style={{ 
      padding: 16, 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: 'calc(100vh - 120px)',
    }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: '#111827' }}>
        Фото товара
      </h2>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 12 }}>
        До 4 фотографий (необязательно)
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {[0, 1, 2, 3].map((idx) => {
          const photo = photos[idx];
          const isEmptySlot = !photo;
          const canAddMore = photos.length < MAX_PHOTOS;
          
          return (
            <div 
              key={idx} 
              style={{ 
                position: 'relative', 
                height: 120,
                background: isEmptySlot ? '#F3F4F6' : 'transparent', 
                borderRadius: 10, 
                overflow: 'hidden', 
                border: isEmptySlot ? '2px dashed #D1D5DB' : '1px solid #E5E7EB',
              }}
            >
              {photo ? (
                <>
                  <img 
                    src={photo.localPreviewUrl} 
                    alt={`Фото ${idx + 1}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    data-testid={`img-photo-${idx}`} 
                  />
                  
                  {photo.uploadStatus === 'uploading' && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(43, 92, 255, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Loader2 size={28} color="#fff" className="animate-spin" />
                      <span style={{ fontSize: 12, color: '#fff', marginTop: 6, fontWeight: 500 }}>Загрузка...</span>
                    </div>
                  )}
                  
                  {photo.uploadStatus === 'error' && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(239, 68, 68, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <button
                        onClick={() => handleRetryUpload(photo.id)}
                        style={{
                          padding: '8px 16px',
                          background: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#EF4444',
                          cursor: 'pointer',
                        }}
                        data-testid={`button-retry-${idx}`}
                      >
                        <RefreshCw size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Повторить
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleRemovePhoto(photo.id)}
                    disabled={photo.uploadStatus === 'uploading'}
                    style={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8, 
                      background: 'rgba(0,0,0,0.7)', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: 32, 
                      height: 32, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      opacity: photo.uploadStatus === 'uploading' ? 0.5 : 1,
                    }}
                    data-testid={`button-remove-photo-${idx}`}
                  >
                    <X size={16} />
                  </button>
                  
                  {idx === 0 && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 8, 
                      left: 8, 
                      background: BRAND_BLUE, 
                      color: '#fff', 
                      padding: '3px 8px', 
                      borderRadius: 6, 
                      fontSize: 11, 
                      fontWeight: 600,
                    }}>
                      Главное
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={handleOpenActionSheet}
                  disabled={!canAddMore || isAnyUploading}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    background: 'none', 
                    border: 'none', 
                    cursor: (!canAddMore || isAnyUploading) ? 'not-allowed' : 'pointer', 
                    opacity: (!canAddMore || isAnyUploading) ? 0.5 : 1,
                  }}
                  data-testid={`button-add-photo-${idx}`}
                >
                  <Camera size={28} color="#9CA3AF" />
                  <span style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>Добавить</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        style={{ display: 'none' }}
        data-testid="input-camera"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleGallerySelect}
        style={{ display: 'none' }}
        data-testid="input-gallery"
      />

      {error && (
        <div style={{ marginTop: 16, background: '#FEF3C7', border: '1px solid #FDE047', padding: 12, borderRadius: 8, fontSize: 14, color: '#92400E' }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{ marginLeft: 8, background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', fontWeight: 600 }}
          >
            ✕
          </button>
        </div>
      )}

      {hasErrors && (
        <div style={{ marginTop: 16, background: '#FEE2E2', border: '1px solid #FCA5A5', padding: 12, borderRadius: 8, fontSize: 14, color: '#991B1B' }}>
          Некоторые фото не загрузились. Нажмите «Повторить» на фото или продолжите без них.
        </div>
      )}

      <div style={{ marginTop: 12, padding: 10, background: '#EBF3FF', borderRadius: 8, fontSize: 13, color: '#1E40AF' }}>
        Качественные фотографии помогают быстрее продать товар
      </div>

      <div style={{ marginTop: 10, padding: 10, background: '#F3F4F6', borderRadius: 8, fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Объявления без фотографий не показываются в ленте, но будут доступны в поиске и категориях.</span>
      </div>

      {showActionSheet && (
        <>
          <div
            onClick={() => setShowActionSheet(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
            data-testid="action-sheet-backdrop"
          />
          <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            background: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: '16px 16px 32px',
            zIndex: 101,
            animation: 'slideUp 0.2s ease-out',
          }} data-testid="action-sheet">
            <div style={{ width: 40, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, textAlign: 'center', marginBottom: 20, color: '#111827' }}>
              Выберите источник
            </h3>
            <button
              onClick={() => handleSourceSelect('camera')}
              style={{
                width: '100%',
                padding: '16px',
                marginBottom: 12,
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
              data-testid="button-source-camera"
            >
              <Camera size={24} color={BRAND_BLUE} />
              Сделать фото
            </button>
            <button
              onClick={() => handleSourceSelect('gallery')}
              style={{
                width: '100%',
                padding: '16px',
                marginBottom: 12,
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
              data-testid="button-source-gallery"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
              Выбрать из галереи (до {MAX_PHOTOS - photos.length})
            </button>
            <button
              onClick={() => setShowActionSheet(false)}
              style={{
                width: '100%',
                padding: '14px',
                background: '#F3F4F6',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 500,
                color: '#6B7280',
                cursor: 'pointer',
              }}
              data-testid="button-cancel-action-sheet"
            >
              Отмена
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Step5Confirm({ 
  draft, 
  categories, 
  onEdit 
}: { 
  draft: DraftAd; 
  categories: CategoryNode[];
  onEdit: (step: number) => void;
}) {
  const selectedCategory = categories.find(c => c.slug === draft.info.categoryId);
  const selectedSubcategory = selectedCategory?.subcategories?.find(s => s.slug === draft.info.subcategoryId);
  
  const uploadedPhotos = draft.photos.filter(p => p.uploadStatus === 'done' && p.remoteUrl);
  
  const getContactLabel = () => {
    if (draft.contacts.contactPhone) return `Телефон: ${draft.contacts.contactPhone}`;
    if (draft.contacts.contactUsername) return `Telegram: @${draft.contacts.contactUsername}`;
    if (draft.contacts.contactInstagram) return `Instagram: @${draft.contacts.contactInstagram}`;
    return 'Не указан';
  };

  const Section = ({ 
    title, 
    step, 
    children 
  }: { 
    title: string; 
    step: number; 
    children: React.ReactNode;
  }) => (
    <div style={{ 
      background: '#fff', 
      borderRadius: 12, 
      padding: 16,
      marginBottom: 12,
      border: '1px solid #E5E7EB',
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h3>
        <button
          onClick={() => onEdit(step)}
          style={{
            background: BRAND_BLUE_LIGHT,
            border: `1px solid ${BRAND_BLUE_BORDER}`,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 500,
            color: BRAND_BLUE,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          data-testid={`button-edit-step-${step}`}
        >
          <Edit3 size={14} />
          Изменить
        </button>
      </div>
      {children}
    </div>
  );

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
      <span style={{ fontSize: 14, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 14, color: '#111827', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: 16, paddingBottom: 120 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', color: '#111827' }}>
        Проверьте объявление
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 20 }}>
        Убедитесь, что всё указано верно
      </p>

      <Section title="Фото" step={2}>
        {uploadedPhotos.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {uploadedPhotos.map((photo, idx) => (
              <img 
                key={photo.id} 
                src={photo.localPreviewUrl} 
                alt={`Фото ${idx + 1}`}
                style={{ 
                  width: 80, 
                  height: 80, 
                  objectFit: 'cover', 
                  borderRadius: 8,
                  flexShrink: 0,
                }}
                data-testid={`confirm-photo-${idx}`}
              />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>Без фото</p>
        )}
      </Section>

      <Section title="Товар" step={3}>
        <Row label="Название" value={draft.info.title} />
        <Row label="Категория" value={selectedCategory?.name || draft.info.categoryId} />
        {selectedSubcategory && <Row label="Подкатегория" value={selectedSubcategory.name} />}
        <Row label="Цена" value={`${parseFloat(draft.info.price).toLocaleString('ru-RU')} руб.`} />
        {draft.info.description && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 14, color: '#6B7280', display: 'block', marginBottom: 4 }}>Описание</span>
            <p style={{ fontSize: 14, color: '#111827', margin: 0, whiteSpace: 'pre-wrap' }}>{draft.info.description}</p>
          </div>
        )}
      </Section>

      <Section title="Местоположение" step={1}>
        <Row label="Адрес" value={draft.location?.geoLabel || 'Не указан'} />
      </Section>

      <Section title="Контакты" step={4}>
        <Row label="Способ связи" value={getContactLabel()} />
        {draft.publishAt && (
          <Row 
            label="Публикация" 
            value={`Запланировано на ${draft.publishAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`} 
          />
        )}
      </Section>

      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        background: '#ECFDF5', 
        border: '1px solid #10B981', 
        borderRadius: 8, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 10,
      }}>
        <Check size={20} color="#10B981" />
        <span style={{ fontSize: 14, color: '#065F46' }}>
          Всё готово к публикации! Нажмите «Опубликовать» ниже.
        </span>
      </div>
    </div>
  );
}

interface CreatedSubcategory {
  _id: string;
  slug: string;
  name: string;
  icon3d: string | null;
  keywordTokens: string[];
  isAutoGenerated: boolean;
  isVisible: boolean;
}

interface CategorySuggestion {
  categoryId: string | null;
  categoryName: string;
  categorySlug: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  subcategorySlug: string | null;
  confidence: number;
  source?: string;
  createdSubcategory?: CreatedSubcategory | null;
}

function Step3Info({ info, categories, onSetInfo, city, noPhotos, onGoToPhotos }: { info: InfoData; categories: CategoryNode[]; onSetInfo: (info: Partial<InfoData>) => void; city?: string; noPhotos?: boolean; onGoToPhotos?: () => void }) {
  const selectedCategory = categories.find(c => c.slug === info.categoryId);
  const subcategories = selectedCategory?.subcategories || [];
  const priceNumber = parseFloat(info.price) || 0;
  
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  
  const [descriptionSuggestion, setDescriptionSuggestion] = useState<string | null>(null);
  const [descriptionSuggestionDismissed, setDescriptionSuggestionDismissed] = useState(false);
  const [descriptionSuggestionLoading, setDescriptionSuggestionLoading] = useState(false);

  useEffect(() => {
    if (suggestionDismissed || info.categoryId) {
      setSuggestion(null);
      return;
    }

    if (!info.title || info.title.length < 3) {
      setSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSuggestionLoading(true);
      try {
        const response = await fetch('/api/categories/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: info.title, 
            description: info.description,
            autoCreate: true
          }),
        });
        const data = await response.json();
        
        if (data.bestMatch && data.bestMatch.categorySlug) {
          setSuggestion(data.bestMatch);
        } else {
          setSuggestion(null);
        }
      } catch (err) {
        console.error('Category suggest error:', err);
        setSuggestion(null);
      } finally {
        setSuggestionLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [info.title, info.description, info.categoryId, suggestionDismissed]);

  useEffect(() => {
    if (descriptionSuggestionDismissed || info.description) {
      setDescriptionSuggestion(null);
      return;
    }

    if (!info.title || info.title.length < 3 || !info.categoryId) {
      setDescriptionSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      setDescriptionSuggestionLoading(true);
      try {
        const response = await fetch('/api/ai/suggest-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: info.title,
            categoryId: info.categoryId,
            subcategoryId: info.subcategoryId || undefined,
          }),
        });
        const data = await response.json();
        
        if (data.success && data.data?.description) {
          setDescriptionSuggestion(data.data.description);
        } else {
          const isFarmer = info.categoryId === 'farmer-market' || info.categoryId?.startsWith('farmer');
          const fallback = isFarmer
            ? `${info.title}\n\nСвежий продукт отличного качества. Выращено с заботой, натуральный вкус!\n\nВозможна доставка или самовывоз.`
            : `${info.title}\n\nОтличное состояние, готов к использованию.\n\nВсе вопросы по телефону.`;
          setDescriptionSuggestion(fallback);
        }
      } catch (err) {
        console.error('Description suggest error:', err);
        const fallback = `${info.title}\n\nОтличное состояние. Продаю по выгодной цене!`;
        setDescriptionSuggestion(fallback);
      } finally {
        setDescriptionSuggestionLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [info.title, info.categoryId, info.subcategoryId, info.description, descriptionSuggestionDismissed]);

  const applyDescriptionSuggestion = () => {
    if (!descriptionSuggestion) return;
    onSetInfo({ description: descriptionSuggestion });
    setDescriptionSuggestion(null);
    setDescriptionSuggestionDismissed(true);
  };

  const dismissDescriptionSuggestion = () => {
    setDescriptionSuggestion(null);
    setDescriptionSuggestionDismissed(true);
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    
    const catSlug = suggestion.categorySlug;
    const subSlug = suggestion.subcategorySlug;
    
    const findInTree = (targetSlug: string): { topLevel: string; subLevel: string } | null => {
      for (const cat of categories) {
        if (cat.slug === targetSlug) {
          return { topLevel: cat.slug, subLevel: '' };
        }
        
        for (const sub of cat.subcategories || []) {
          if (sub.slug === targetSlug) {
            return { topLevel: cat.slug, subLevel: sub.slug };
          }
          
          for (const nested of sub.subcategories || []) {
            if (nested.slug === targetSlug) {
              return { topLevel: cat.slug, subLevel: sub.slug };
            }
          }
        }
      }
      return null;
    };
    
    let result = subSlug ? findInTree(subSlug) : null;
    
    if (!result) {
      result = findInTree(catSlug);
    }
    
    if (result) {
      onSetInfo({ categoryId: result.topLevel, subcategoryId: result.subLevel });
    }
    
    setSuggestion(null);
    setSuggestionDismissed(true);
  };

  const dismissSuggestion = () => {
    setSuggestion(null);
    setSuggestionDismissed(true);
  };

  const handleGenerateDescription = async () => {
    if (!info.title || info.title.length < 3) return;
    
    setGeneratingDescription(true);
    try {
      const response = await fetch('/api/ai/suggest-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: info.title,
          categoryId: info.categoryId || undefined,
          subcategoryId: info.subcategoryId || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.description) {
        onSetInfo({ description: data.data.description });
      } else {
        const fallbackDescriptions: Record<string, string> = {
          'farm': `${info.title}\n\nСвежий продукт, выращенный с заботой. Отличное качество, натуральный вкус. Возможна доставка или самовывоз.`,
          'electronics': `${info.title}\n\nВ отличном состоянии. Полностью рабочий, без дефектов. Продаю в связи с переездом.`,
          'default': `${info.title}\n\nХорошее состояние, готов к использованию. Все вопросы по телефону.`,
        };
        const categoryKey = info.categoryId && ['farm', 'electronics'].includes(info.categoryId) ? info.categoryId : 'default';
        onSetInfo({ description: fallbackDescriptions[categoryKey] });
      }
    } catch (err) {
      console.error('Description generation error:', err);
      onSetInfo({ description: `${info.title}\n\nОтличное состояние. Продаю по выгодной цене. Звоните, отвечу на все вопросы!` });
    } finally {
      setGeneratingDescription(false);
    }
  };

  return (
    <div style={{ padding: 24, paddingBottom: 120 }}>
      {noPhotos && (
        <button
          onClick={onGoToPhotos}
          style={{
            width: '100%',
            background: '#EBF3FF',
            border: '1px solid #3B73FC',
            padding: '14px 16px',
            borderRadius: 12,
            fontSize: 15,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            textAlign: 'left',
          }}
          data-testid="button-add-photos-reminder"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B73FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#1E40AF', fontWeight: 600 }}>Добавить фотографии</div>
            <div style={{ color: '#3B73FC', fontSize: 13, marginTop: 2 }}>Объявления с фото продаются быстрее</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B73FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}
      
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
        
        {suggestionLoading && (
          <div style={{ marginTop: 8, fontSize: 14, color: '#6B7280' }}>
            Подбираем категорию...
          </div>
        )}
        
        {suggestion && !info.categoryId && (
          <div 
            style={{
              marginTop: 12,
              padding: 14,
              background: suggestion.createdSubcategory ? '#ECFDF5' : '#F0F9FF',
              border: `1px solid ${suggestion.createdSubcategory ? '#10B981' : '#3B73FC'}`,
              borderRadius: 12,
            }}
            data-testid="category-suggestion-card"
          >
            <div style={{ 
              fontSize: 14, 
              color: suggestion.createdSubcategory ? '#047857' : '#3B73FC', 
              fontWeight: 500, 
              marginBottom: 6 
            }}>
              {suggestion.createdSubcategory 
                ? 'Создана новая подкатегория для вашего товара:' 
                : 'Мы подобрали категорию:'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: suggestion.createdSubcategory ? '#065F46' : '#1E40AF', marginBottom: 8 }}>
              {suggestion.categoryName}
              {suggestion.subcategoryName && (
                <span style={{ fontWeight: 400 }}> → {suggestion.subcategoryName}</span>
              )}
            </div>
            {suggestion.createdSubcategory && (
              <div style={{ 
                fontSize: 13, 
                color: '#047857', 
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{ display: 'inline-flex', width: 16, height: 16, background: '#10B981', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10 }}>✓</span>
                Подкатегория создана автоматически
              </div>
            )}
            {suggestion.confidence !== undefined && (
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                Уверенность: {Math.round(suggestion.confidence * 100)}%
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={applySuggestion}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: suggestion.createdSubcategory ? '#10B981' : '#3B73FC',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                data-testid="button-apply-suggestion"
              >
                Применить
              </button>
              <button
                type="button"
                onClick={dismissSuggestion}
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  color: suggestion.createdSubcategory ? '#10B981' : '#3B73FC',
                  border: `1px solid ${suggestion.createdSubcategory ? '#10B981' : '#3B73FC'}`,
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                data-testid="button-dismiss-suggestion"
              >
                Выбрать другую
              </button>
            </div>
          </div>
        )}
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
          <span style={{ fontSize: 16, fontWeight: 500, color: '#6B7280' }}>руб.</span>
        </div>
        
        {info.categoryId && priceNumber > 0 && (
          <PriceHint
            categoryId={info.categoryId}
            subcategoryId={info.subcategoryId || undefined}
            price={priceNumber}
            city={city}
          />
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>Описание (по желанию)</label>
          {!descriptionSuggestion && !info.description && (
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={generatingDescription || !info.title || info.title.length < 3}
              style={{
                padding: '6px 12px',
                background: generatingDescription ? '#E5E7EB' : '#EBF3FF',
                border: `1px solid ${generatingDescription ? '#D1D5DB' : '#3B73FC'}`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: generatingDescription ? '#6B7280' : '#3B73FC',
                cursor: (generatingDescription || !info.title || info.title.length < 3) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              data-testid="button-generate-description"
            >
              {generatingDescription ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Генерирую...
                </>
              ) : (
                <>
                  <Edit3 size={14} />
                  Помочь с описанием
                </>
              )}
            </button>
          )}
        </div>
        
        {descriptionSuggestionLoading && !info.description && (
          <div style={{ marginBottom: 12, fontSize: 14, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={16} className="animate-spin" style={{ color: '#3B73FC' }} />
            Подбираем описание...
          </div>
        )}
        
        {descriptionSuggestion && !info.description && (
          <div 
            style={{
              marginBottom: 12,
              padding: 14,
              background: '#F0FDF4',
              border: '1px solid #10B981',
              borderRadius: 12,
            }}
            data-testid="description-suggestion-card"
          >
            <div style={{ fontSize: 14, color: '#059669', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={16} />
              Мы подготовили описание:
            </div>
            <div style={{ 
              fontSize: 14, 
              color: '#065F46', 
              marginBottom: 12,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
              background: '#fff',
              padding: 12,
              borderRadius: 8,
              maxHeight: 120,
              overflow: 'auto',
            }}>
              {descriptionSuggestion}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={applyDescriptionSuggestion}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#10B981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                data-testid="button-apply-description"
              >
                <Check size={16} />
                Использовать
              </button>
              <button
                type="button"
                onClick={dismissDescriptionSuggestion}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#059669',
                  border: '1px solid #10B981',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                data-testid="button-dismiss-description"
              >
                Напишу сам
              </button>
            </div>
          </div>
        )}
        
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

function Step4Contacts({
  contacts,
  user,
  onSetContacts,
  publishAt,
  onSetPublishAt,
}: {
  contacts: ContactsData;
  user: { phone?: string | null; username?: string | null } | null;
  onSetContacts: (contacts: Partial<ContactsData>) => void;
  publishAt: Date | null;
  onSetPublishAt: (date: Date | null) => void;
}) {
  const hasPhone = !!user?.phone;
  const hasUsername = !!user?.username;

  useEffect(() => {
    if (hasPhone && !contacts.contactPhone) {
      onSetContacts({ contactType: 'telegram_phone', contactPhone: user?.phone || '' });
    } else if (hasUsername && !contacts.contactUsername) {
      onSetContacts({ contactType: 'telegram_username', contactUsername: user?.username || '' });
    }
  }, [hasPhone, hasUsername]);

  return (
    <div style={{ padding: 24, paddingBottom: 120 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 12px', color: '#111827' }}>
        Как с вами свяжутся?
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 24 }}>
        Укажите удобный способ связи
      </p>

      {hasPhone && (
        <button
          type="button"
          onClick={() => onSetContacts({ contactType: 'telegram_phone', contactPhone: user?.phone || '' })}
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
          <div style={{ color: '#6B7280' }}>{user?.phone}</div>
        </button>
      )}

      {hasUsername && (
        <button
          type="button"
          onClick={() => onSetContacts({ contactType: 'telegram_username', contactUsername: user?.username || '' })}
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
          <div style={{ color: '#6B7280' }}>@{user?.username}</div>
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

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>
        <SchedulePublishBlock
          publishAt={publishAt}
          onChange={onSetPublishAt}
        />
      </div>
    </div>
  );
}
