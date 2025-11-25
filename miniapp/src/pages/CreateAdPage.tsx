import { useState, useEffect, useReducer, useRef } from 'react';
import { useLocation } from 'wouter';
import { useUserStore } from '@/store/useUserStore';
import { fetchCategories } from '@/api/categories';
import { createAd, CreateAdPayload } from '@/api/ads';
import { resolveGeoLocation, getPresetLocations, PresetLocation } from '@/api/geo';
import { CategoryNode } from '@/types';
import { ArrowLeft, MapPin, Loader2, Camera, X, Check, RefreshCw, Edit3 } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import PriceHint from '@/components/PriceHint';
import { SchedulePublishBlock } from '@/components/schedule/SchedulePublishBlock';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const createBrandPinIcon = () => {
  const svgIcon = `
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <path d="M18 2C10.268 2 4 8.268 4 16c0 10 14 24 14 24s14-14 14-24c0-7.732-6.268-14-14-14z" 
            fill="${BRAND_BLUE}" filter="url(#shadow)"/>
      <circle cx="18" cy="16" r="6" fill="white"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'brand-pin-icon',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
};

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

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
    if (currentStep === 2) return true;
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
      currency: 'BYN',
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

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={handleBack} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }} data-testid="button-back">
            <ArrowLeft size={24} color="#111827" />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Подача объявления</h1>
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

  const handleChooseOther = () => {
    setShowPresets(true);
  };

  const brandPinIcon = createBrandPinIcon();

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', color: '#111827', textAlign: 'center' }}>
        Где вы продаёте?
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', margin: '0 0 20px' }}>
        Мы определим район, где вы находитесь
      </p>

      {!location && !showPresets && (
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
      )}

      {location && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            background: '#EBF3FF', 
            border: `2px solid ${BRAND_BLUE}`, 
            borderRadius: 12, 
            padding: 16, 
            textAlign: 'center',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Ваше местоположение:</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: BRAND_BLUE }}>{location.geoLabel}</div>
          </div>

          <div style={{ 
            borderRadius: 12, 
            overflow: 'hidden', 
            height: 200,
            border: '1px solid #E5E7EB',
          }}>
            <MapContainer
              center={[location.lat, location.lng]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenterUpdater center={[location.lat, location.lng]} />
              <Circle
                center={[location.lat, location.lng]}
                radius={400}
                pathOptions={{
                  fillColor: BRAND_BLUE_LIGHT,
                  fillOpacity: 0.4,
                  color: BRAND_BLUE_BORDER,
                  weight: 2,
                }}
              />
              <Marker position={[location.lat, location.lng]} icon={brandPinIcon} />
            </MapContainer>
          </div>

          <button
            onClick={handleChooseOther}
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
        <div style={{ marginTop: 16, background: '#FEE2E2', border: '1px solid #FCA5A5', padding: 12, borderRadius: 8, fontSize: 14, color: '#991B1B' }}>
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
          {!location && (
            <button
              onClick={handleAutoDetect}
              disabled={loading}
              style={{
                marginTop: 16,
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

      <style>{`
        .brand-pin-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
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
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', color: '#111827' }}>
        Фото товара
      </h2>
      <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 20 }}>
        До 4 фотографий (необязательно)
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[0, 1, 2, 3].map((idx) => {
          const photo = photos[idx];
          const isEmptySlot = !photo;
          const canAddMore = photos.length < MAX_PHOTOS;
          
          return (
            <div 
              key={idx} 
              style={{ 
                position: 'relative', 
                aspectRatio: '1', 
                background: isEmptySlot ? '#F3F4F6' : 'transparent', 
                borderRadius: 12, 
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

      <div style={{ marginTop: 16, padding: 12, background: '#EBF3FF', borderRadius: 8, fontSize: 14, color: '#1E40AF' }}>
        Качественные фотографии помогают быстрее продать товар
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
        <Row label="Цена" value={`${parseFloat(draft.info.price).toLocaleString('ru-RU')} BYN`} />
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

function Step3Info({ info, categories, onSetInfo, city, noPhotos, onGoToPhotos }: { info: InfoData; categories: CategoryNode[]; onSetInfo: (info: Partial<InfoData>) => void; city?: string; noPhotos?: boolean; onGoToPhotos?: () => void }) {
  const selectedCategory = categories.find(c => c.slug === info.categoryId);
  const subcategories = selectedCategory?.subcategories || [];
  const priceNumber = parseFloat(info.price) || 0;

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

function Step4Contacts({
  contacts,
  user,
  onSetContacts,
  publishAt,
  onSetPublishAt,
}: {
  contacts: ContactsData;
  user: { phone?: string; username?: string } | null;
  onSetContacts: (contacts: Partial<ContactsData>) => void;
  publishAt: Date | null;
  onSetPublishAt: (date: Date | null) => void;
}) {
  const hasPhone = !!user?.phone;
  const hasUsername = !!user?.username;

  useEffect(() => {
    if (hasPhone && !contacts.contactPhone) {
      onSetContacts({ contactType: 'telegram_phone', contactPhone: user?.phone });
    } else if (hasUsername && !contacts.contactUsername) {
      onSetContacts({ contactType: 'telegram_username', contactUsername: user?.username });
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
          onClick={() => onSetContacts({ contactType: 'telegram_phone', contactPhone: user?.phone })}
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
          onClick={() => onSetContacts({ contactType: 'telegram_username', contactUsername: user?.username })}
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
