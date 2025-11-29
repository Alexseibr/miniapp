import { useState, useEffect, useReducer, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { createAd, CreateAdPayload } from '@/api/ads';
import { resolveGeoLocation, getPresetLocations, PresetLocation } from '@/api/geo';
import { ArrowLeft, MapPin, Loader2, Camera, X, Check, RefreshCw, Edit3, Gift } from 'lucide-react';
import { showPublishNotification } from '@/utils/showPublishNotification';
import ScreenLayout from '@/components/layout/ScreenLayout';

const PINK_ACCENT = '#EC4899';
const PINK_LIGHT = 'rgba(236, 72, 153, 0.12)';
const PINK_BORDER = 'rgba(236, 72, 153, 0.4)';

const GIVEAWAY_SUBCATEGORIES = [
  { id: 'clothes', name: 'Одежда' },
  { id: 'kids', name: 'Детские вещи' },
  { id: 'furniture', name: 'Мебель' },
  { id: 'tech', name: 'Техника' },
  { id: 'other', name: 'Прочее' },
];

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface GiveawayPhoto {
  id: string;
  localPreviewUrl: string;
  file: File | null;
  uploadStatus: UploadStatus;
  remoteUrl?: string;
}

interface LocationData {
  lat: number;
  lng: number;
  geoLabel: string;
}

interface InfoData {
  title: string;
  giveawaySubcategoryId: string;
  description: string;
}

interface ContactsData {
  contactPhone: string;
  contactUsername: string;
}

interface DraftGiveaway {
  location: LocationData | null;
  photo: GiveawayPhoto | null;
  info: InfoData;
  contacts: ContactsData;
}

type WizardAction =
  | { type: 'SET_LOCATION'; payload: LocationData }
  | { type: 'SET_PHOTO'; payload: GiveawayPhoto | null }
  | { type: 'UPDATE_PHOTO'; payload: Partial<GiveawayPhoto> }
  | { type: 'SET_INFO'; payload: Partial<InfoData> }
  | { type: 'SET_CONTACTS'; payload: Partial<ContactsData> };

const initialState: DraftGiveaway = {
  location: null,
  photo: null,
  info: { title: '', giveawaySubcategoryId: '', description: '' },
  contacts: { contactPhone: '', contactUsername: '' },
};

function draftReducer(state: DraftGiveaway, action: WizardAction): DraftGiveaway {
  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, location: action.payload };
    case 'SET_PHOTO':
      return { ...state, photo: action.payload };
    case 'UPDATE_PHOTO':
      return state.photo ? { ...state, photo: { ...state.photo, ...action.payload } } : state;
    case 'SET_INFO':
      return { ...state, info: { ...state.info, ...action.payload } };
    case 'SET_CONTACTS':
      return { ...state, contacts: { ...state.contacts, ...action.payload } };
    default:
      return state;
  }
}

export default function CreateGiveawayAdPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState(1);
  const [draft, dispatch] = useReducer(draftReducer, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.phone) {
      dispatch({ type: 'SET_CONTACTS', payload: { contactPhone: user.phone } });
    }
    if (user?.username) {
      dispatch({ type: 'SET_CONTACTS', payload: { contactUsername: user.username } });
    }
  }, [user]);

  const canGoNext = () => {
    if (currentStep === 1) return !!draft.location;
    if (currentStep === 2) {
      if (!draft.photo) return true;
      return draft.photo.uploadStatus !== 'uploading';
    }
    if (currentStep === 3) return !!draft.info.title && !!draft.info.giveawaySubcategoryId;
    if (currentStep === 4) return true;
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
    if (submitting) return;

    if (!user?.telegramId || !draft.location) {
      setError('Требуется авторизация и местоположение');
      return;
    }

    const hasContact = draft.contacts.contactPhone || draft.contacts.contactUsername;
    if (!hasContact) {
      setError('Требуется хотя бы один способ связи');
      return;
    }

    const photos: string[] = [];
    if (draft.photo?.uploadStatus === 'done' && draft.photo.remoteUrl) {
      photos.push(draft.photo.remoteUrl);
    }

    const payload: CreateAdPayload = {
      title: draft.info.title.trim(),
      description: draft.info.description.trim() || undefined,
      categoryId: 'darom',
      subcategoryId: draft.info.giveawaySubcategoryId,
      price: 0,
      currency: 'RUB',
      photos: photos.length > 0 ? photos : undefined,
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
      contactType: draft.contacts.contactPhone ? 'telegram_phone' : 'telegram_username',
      contactPhone: draft.contacts.contactPhone || undefined,
      contactUsername: draft.contacts.contactUsername || undefined,
      isFreeGiveaway: true,
      giveawaySubcategoryId: draft.info.giveawaySubcategoryId,
    };

    try {
      setSubmitting(true);
      setError('');
      await createAd(payload);
      showPublishNotification('Ваша вещь добавлена в раздел "Даром"!');
      navigate('/my-ads');
    } catch (err: any) {
      console.error('Create giveaway error:', err);
      setError(err.message || 'Не удалось разместить объявление');
      setSubmitting(false);
    }
  };

  const headerContent = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gift size={22} color={PINK_ACCENT} />
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: PINK_ACCENT,
              letterSpacing: '-0.5px',
            }}
          >
            Даром отдаю
          </h1>
        </div>
      </div>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            onClick={handleBack}
            style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}
            data-testid="button-back"
          >
            <ArrowLeft size={24} color="#111827" />
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Отдать бесплатно</h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: step <= currentStep ? PINK_ACCENT : '#E5E7EB',
              }}
            />
          ))}
        </div>
      </div>
    </>
  );

  return (
    <ScreenLayout header={headerContent} showBottomNav={false}>
      <div style={{ background: '#F9FAFB', minHeight: '100%' }}>
        {currentStep === 1 && (
          <Step1Location
            location={draft.location}
            onSetLocation={(loc) => dispatch({ type: 'SET_LOCATION', payload: loc })}
            onComplete={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 2 && (
          <Step2Photo
            photo={draft.photo}
            onSetPhoto={(photo) => dispatch({ type: 'SET_PHOTO', payload: photo })}
            onUpdatePhoto={(updates) => dispatch({ type: 'UPDATE_PHOTO', payload: updates })}
          />
        )}
        {currentStep === 3 && (
          <Step3Info
            info={draft.info}
            onSetInfo={(info) => dispatch({ type: 'SET_INFO', payload: info })}
          />
        )}
        {currentStep === 4 && (
          <Step4Confirm draft={draft} onEdit={(step) => setCurrentStep(step)} />
        )}

        {error && (
          <div
            style={{
              margin: '16px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              padding: 12,
              borderRadius: 8,
            }}
          >
            <p style={{ color: '#991B1B', margin: 0, fontSize: 14 }}>{error}</p>
          </div>
        )}

        <div
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#fff',
            borderTop: '1px solid #E5E7EB',
            padding: '10px 16px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <button
            onClick={handleNext}
            disabled={!canGoNext() || submitting}
            style={{
              width: '100%',
              padding: '14px',
              background: !canGoNext() || submitting ? '#9CA3AF' : PINK_ACCENT,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 600,
              cursor: !canGoNext() || submitting ? 'not-allowed' : 'pointer',
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
                Публикуем...
              </>
            ) : currentStep === 4 ? (
              <>
                <Gift size={20} />
                Отдать даром
              </>
            ) : (
              'Далее'
            )}
          </button>
        </div>
      </div>
    </ScreenLayout>
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
  const [autoDetectAttempted, setAutoDetectAttempted] = useState(false);

  useEffect(() => {
    getPresetLocations()
      .then((res) => setPresets(res.items))
      .catch(console.error);
  }, []);

  const handleAutoDetect = useCallback(async () => {
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
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = pos.coords;

      try {
        const result = await resolveGeoLocation(latitude, longitude);
        onSetLocation({ lat: result.lat, lng: result.lng, geoLabel: result.label });
      } catch {
        const fallbackLabel = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        onSetLocation({ lat: latitude, lng: longitude, geoLabel: fallbackLabel });
        setError('Не удалось определить адрес. Пожалуйста, выберите город из списка.');
        setShowPresets(true);
      }
    } catch (err: any) {
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
  }, [onSetLocation]);

  useEffect(() => {
    if (!location && !autoDetectAttempted) {
      setAutoDetectAttempted(true);
      setTimeout(() => {
        handleAutoDetect();
      }, 100);
    }
  }, [location, autoDetectAttempted, handleAutoDetect]);

  const handleSelectPreset = (preset: PresetLocation) => {
    onSetLocation({ lat: preset.lat, lng: preset.lng, geoLabel: preset.label });
    setShowPresets(false);
    setError('');
  };

  return (
    <div style={{ padding: 16 }}>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          margin: '0 0 8px',
          color: '#111827',
          textAlign: 'center',
        }}
      >
        Где вы находитесь?
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', margin: '0 0 20px' }}>
        Укажите город, чтобы люди рядом могли забрать вещь
      </p>

      {!location && !showPresets && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleAutoDetect}
            disabled={loading}
            style={{
              width: '100%',
              padding: '18px',
              background: loading ? '#9CA3AF' : PINK_ACCENT,
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
              color: PINK_ACCENT,
              border: `1px solid ${PINK_ACCENT}`,
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
              background: PINK_LIGHT,
              border: `2px solid ${PINK_ACCENT}`,
              borderRadius: 12,
              padding: 20,
              textAlign: 'center',
              marginBottom: 16,
              cursor: 'pointer',
            }}
            data-testid="button-confirm-location"
          >
            <div
              style={{
                width: 56,
                height: 56,
                background: PINK_ACCENT,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <Check size={28} color="#fff" />
            </div>
            <div style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>
              Ваше местоположение:
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: PINK_ACCENT }}>
              {location.geoLabel}
            </div>
            <div
              style={{
                marginTop: 12,
                padding: '10px 16px',
                background: PINK_ACCENT,
                color: '#fff',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                display: 'inline-block',
              }}
            >
              Подтвердить и продолжить
            </div>
          </button>

          <button
            onClick={() => setShowPresets(true)}
            style={{
              width: '100%',
              background: 'transparent',
              border: `1px solid ${PINK_ACCENT}`,
              color: PINK_ACCENT,
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
        <div
          style={{
            marginTop: 16,
            marginBottom: 16,
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            padding: 12,
            borderRadius: 8,
            fontSize: 14,
            color: '#92400E',
          }}
        >
          {error}
        </div>
      )}

      {showPresets && presets.length > 0 && (
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
                  background: location?.geoLabel === preset.label ? PINK_LIGHT : '#fff',
                  border:
                    location?.geoLabel === preset.label
                      ? `2px solid ${PINK_ACCENT}`
                      : '1px solid #E5E7EB',
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
                <MapPin
                  size={20}
                  color={location?.geoLabel === preset.label ? PINK_ACCENT : '#6B7280'}
                />
                <span
                  style={{
                    color: location?.geoLabel === preset.label ? PINK_ACCENT : '#111827',
                    fontWeight: location?.geoLabel === preset.label ? 600 : 400,
                  }}
                >
                  {preset.label}
                </span>
              </button>
            ))}
          </div>

          {!location && (
            <button
              onClick={handleAutoDetect}
              disabled={loading}
              style={{
                marginTop: 12,
                width: '100%',
                background: 'transparent',
                border: `1px solid ${PINK_ACCENT}`,
                color: PINK_ACCENT,
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

function Step2Photo({
  photo,
  onSetPhoto,
  onUpdatePhoto,
}: {
  photo: GiveawayPhoto | null;
  onSetPhoto: (photo: GiveawayPhoto | null) => void;
  onUpdatePhoto: (updates: Partial<GiveawayPhoto>) => void;
}) {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [error, setError] = useState('');

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenActionSheet = () => {
    if (photo) return;
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

  const uploadPhoto = async (photoData: GiveawayPhoto): Promise<void> => {
    if (!photoData.file) return;

    onUpdatePhoto({ uploadStatus: 'uploading' });

    try {
      const extension = photoData.file.name.split('.').pop() || 'jpg';
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
        body: photoData.file,
        headers: { 'Content-Type': photoData.file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('upload_failed');
      }

      onUpdatePhoto({ uploadStatus: 'done', remoteUrl: publicURL });
    } catch (err) {
      console.error('Upload error:', err);
      onUpdatePhoto({ uploadStatus: 'error' });
    }
  };

  const handleRetryUpload = async () => {
    if (photo) {
      await uploadPhoto(photo);
    }
  };

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;

    setError('');

    if (file.size > 10 * 1024 * 1024) {
      setError('Файл слишком большой (максимум 10MB)');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    const newPhoto: GiveawayPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      localPreviewUrl: URL.createObjectURL(file),
      file,
      uploadStatus: 'idle',
    };

    onSetPhoto(newPhoto);
    await uploadPhoto(newPhoto);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelected(file || null);
    e.target.value = '';
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelected(file || null);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    if (photo) {
      URL.revokeObjectURL(photo.localPreviewUrl);
      onSetPhoto(null);
    }
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: '#111827' }}>
        Фото вещи
      </h2>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
        Добавьте 1 фотографию (необязательно)
      </p>

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
        onChange={handleGallerySelect}
        style={{ display: 'none' }}
        data-testid="input-gallery"
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1/1',
          maxWidth: 300,
          margin: '0 auto',
          background: photo ? 'transparent' : '#F3F4F6',
          borderRadius: 16,
          overflow: 'hidden',
          border: photo ? `2px solid ${PINK_ACCENT}` : '2px dashed #D1D5DB',
        }}
      >
        {photo ? (
          <>
            <img
              src={photo.localPreviewUrl}
              alt="Фото вещи"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              data-testid="img-photo-preview"
            />

            {photo.uploadStatus === 'uploading' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(236, 72, 153, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Loader2 size={32} color="#fff" className="animate-spin" />
                <span style={{ fontSize: 14, color: '#fff', marginTop: 8, fontWeight: 500 }}>
                  Загрузка...
                </span>
              </div>
            )}

            {photo.uploadStatus === 'error' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={handleRetryUpload}
                  style={{
                    padding: '10px 20px',
                    background: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#EF4444',
                    cursor: 'pointer',
                  }}
                  data-testid="button-retry-upload"
                >
                  <RefreshCw
                    size={16}
                    style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}
                  />
                  Повторить
                </button>
              </div>
            )}

            <button
              onClick={handleRemovePhoto}
              disabled={photo.uploadStatus === 'uploading'}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: photo.uploadStatus === 'uploading' ? 0.5 : 1,
              }}
              data-testid="button-remove-photo"
            >
              <X size={18} />
            </button>

            {photo.uploadStatus === 'done' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  background: '#10B981',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Check size={14} />
                Загружено
              </div>
            )}
          </>
        ) : (
          <button
            onClick={handleOpenActionSheet}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: 8,
            }}
            data-testid="button-add-photo"
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: PINK_LIGHT,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={28} color={PINK_ACCENT} />
            </div>
            <span style={{ fontSize: 15, color: PINK_ACCENT, fontWeight: 500 }}>
              Добавить фото
            </span>
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: 8,
            fontSize: 14,
            color: '#991B1B',
          }}
        >
          {error}
        </div>
      )}

      {showActionSheet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setShowActionSheet(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              background: '#fff',
              borderRadius: '16px 16px 0 0',
              padding: 16,
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: '#D1D5DB',
                borderRadius: 2,
                margin: '0 auto 16px',
              }}
            />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>
              Добавить фото
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => handleSourceSelect('camera')}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: PINK_ACCENT,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
                data-testid="button-source-camera"
              >
                <Camera size={20} />
                Сделать фото
              </button>
              <button
                onClick={() => handleSourceSelect('gallery')}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
                data-testid="button-source-gallery"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
                Выбрать из галереи
              </button>
              <button
                onClick={() => setShowActionSheet(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'transparent',
                  color: '#6B7280',
                  border: 'none',
                  fontSize: 16,
                  cursor: 'pointer',
                  marginTop: 4,
                }}
                data-testid="button-cancel-photo"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step3Info({
  info,
  onSetInfo,
}: {
  info: InfoData;
  onSetInfo: (info: Partial<InfoData>) => void;
}) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 24px', color: '#111827' }}>
        Что отдаёте?
      </h2>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'block',
            fontSize: 15,
            fontWeight: 500,
            marginBottom: 8,
            color: '#111827',
          }}
        >
          Название<span style={{ color: PINK_ACCENT }}>*</span>
        </label>
        <input
          type="text"
          value={info.title}
          onChange={(e) => onSetInfo({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Например: Детская коляска"
          maxLength={50}
          style={{
            width: '100%',
            padding: '14px',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 16,
            fontFamily: 'inherit',
          }}
          data-testid="input-title"
        />
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{info.title.length}/50</div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'block',
            fontSize: 15,
            fontWeight: 500,
            marginBottom: 8,
            color: '#111827',
          }}
        >
          Категория<span style={{ color: PINK_ACCENT }}>*</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GIVEAWAY_SUBCATEGORIES.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSetInfo({ giveawaySubcategoryId: sub.id })}
              style={{
                padding: '10px 16px',
                background: info.giveawaySubcategoryId === sub.id ? PINK_LIGHT : '#fff',
                border:
                  info.giveawaySubcategoryId === sub.id
                    ? `2px solid ${PINK_ACCENT}`
                    : '1px solid #E5E7EB',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: info.giveawaySubcategoryId === sub.id ? 600 : 400,
                color: info.giveawaySubcategoryId === sub.id ? PINK_ACCENT : '#374151',
                cursor: 'pointer',
              }}
              data-testid={`button-subcategory-${sub.id}`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'block',
            fontSize: 15,
            fontWeight: 500,
            marginBottom: 8,
            color: '#111827',
          }}
        >
          Описание (по желанию)
        </label>
        <textarea
          value={info.description}
          onChange={(e) => onSetInfo({ description: e.target.value })}
          placeholder="Опишите состояние вещи, размер, цвет..."
          rows={3}
          maxLength={300}
          style={{
            width: '100%',
            padding: '14px',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 15,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
          data-testid="input-description"
        />
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
          {info.description.length}/300
        </div>
      </div>

      <div
        style={{
          padding: 16,
          background: PINK_LIGHT,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <Gift size={24} color={PINK_ACCENT} style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: PINK_ACCENT, marginBottom: 4 }}>
            Бесплатная вещь
          </div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>
            Объявление будет размещено в разделе "Даром" без указания цены
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4Confirm({
  draft,
  onEdit,
}: {
  draft: DraftGiveaway;
  onEdit: (step: number) => void;
}) {
  const subcategoryName =
    GIVEAWAY_SUBCATEGORIES.find((s) => s.id === draft.info.giveawaySubcategoryId)?.name || '';

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', color: '#111827' }}>
        Проверьте данные
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 24 }}>
        Убедитесь, что всё указано верно
      </p>

      <div
        style={{
          background: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        {draft.photo?.localPreviewUrl && (
          <div style={{ position: 'relative', aspectRatio: '16/9' }}>
            <img
              src={draft.photo.localPreviewUrl}
              alt="Фото"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: PINK_ACCENT,
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Даром
            </div>
          </div>
        )}

        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>
                {draft.info.title || 'Название не указано'}
              </h3>
              <div
                style={{
                  fontSize: 14,
                  color: PINK_ACCENT,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                Бесплатно
              </div>
            </div>
            <button
              onClick={() => onEdit(3)}
              style={{
                padding: '6px 12px',
                background: '#F3F4F6',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              data-testid="button-edit-info"
            >
              <Edit3 size={14} />
              Изменить
            </button>
          </div>

          {subcategoryName && (
            <div
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                background: PINK_LIGHT,
                borderRadius: 6,
                fontSize: 13,
                color: PINK_ACCENT,
                fontWeight: 500,
                marginBottom: 12,
              }}
            >
              {subcategoryName}
            </div>
          )}

          {draft.info.description && (
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              {draft.info.description}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={20} color="#6B7280" />
            <span style={{ fontSize: 15, color: '#374151' }}>
              {draft.location?.geoLabel || 'Не указано'}
            </span>
          </div>
          <button
            onClick={() => onEdit(1)}
            style={{
              padding: '6px 12px',
              background: '#F3F4F6',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
            }}
            data-testid="button-edit-location"
          >
            <Edit3 size={14} />
          </button>
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 8 }}>
          Контакты для связи
        </div>
        {draft.contacts.contactPhone && (
          <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
            Телефон: {draft.contacts.contactPhone}
          </div>
        )}
        {draft.contacts.contactUsername && (
          <div style={{ fontSize: 14, color: '#374151' }}>
            Telegram: @{draft.contacts.contactUsername}
          </div>
        )}
        {!draft.contacts.contactPhone && !draft.contacts.contactUsername && (
          <div style={{ fontSize: 14, color: '#9CA3AF' }}>
            Контакты из вашего Telegram-профиля
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: '#F0FDF4',
          border: '1px solid #10B981',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Check size={24} color="#10B981" />
        <div style={{ fontSize: 14, color: '#065F46' }}>
          После публикации ваше объявление появится в разделе "Даром" и люди рядом смогут его
          увидеть
        </div>
      </div>
    </div>
  );
}
