import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { 
  ArrowLeft, ArrowRight, Check, Store, Tractor, 
  Package, MapPin, Phone, Clock, Truck,
  Loader2, CheckCircle, Instagram, Send, Globe, Sparkles, Palette, Camera
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';
import { useUserStore } from '@/store/useUserStore';
import useGeoStore from '@/store/useGeoStore';

interface ShopFormData {
  shopType: 'farmer' | 'shop' | 'blogger' | 'artisan' | null;
  name: string;
  description: string;
  city: string;
  region: string;
  address: string;
  geo: { lat: number; lng: number } | null;
  contacts: {
    phone: string;
    telegram: string;
    whatsapp: string;
    instagram: string;
    website: string;
  };
  workingHours: {
    preset: string | null;
    customHours: string;
  };
  avatar: string;
  banner: string;
  photos: string[];
  deliveryOptions: {
    hasDelivery: boolean;
    hasPickup: boolean;
    deliveryZone: string;
  };
  categories: string[];
}

const INITIAL_DATA: ShopFormData = {
  shopType: null,
  name: '',
  description: '',
  city: '',
  region: '',
  address: '',
  geo: null,
  contacts: {
    phone: '',
    telegram: '',
    whatsapp: '',
    instagram: '',
    website: '',
  },
  workingHours: {
    preset: null,
    customHours: '',
  },
  avatar: '',
  banner: '',
  photos: [],
  deliveryOptions: {
    hasDelivery: false,
    hasPickup: true,
    deliveryZone: '',
  },
  categories: [],
};

const SHOP_TYPES = [
  { 
    id: 'shop', 
    label: 'Магазин', 
    description: 'Обычный магазин или точка продаж',
    icon: Store, 
    color: '#3B73FC',
    bgColor: '#DBEAFE'
  },
  { 
    id: 'farmer', 
    label: 'Фермер', 
    description: 'Продажа свежих продуктов с вашей фермы',
    icon: Tractor, 
    color: '#10B981',
    bgColor: '#D1FAE5'
  },
  { 
    id: 'blogger', 
    label: 'Блогер / Instagram', 
    description: 'Продажа через соцсети и Instagram',
    icon: Camera, 
    color: '#EC4899',
    bgColor: '#FCE7F3'
  },
  { 
    id: 'artisan', 
    label: 'Ремесленник', 
    description: 'Изделия ручной работы и хендмейд',
    icon: Palette, 
    color: '#8B5CF6',
    bgColor: '#EDE9FE'
  },
];

const WORKING_HOURS_PRESETS = [
  { id: 'daily_9_21', label: 'Ежедневно 9:00–21:00' },
  { id: 'daily_8_20', label: 'Ежедневно 8:00–20:00' },
  { id: 'weekdays_9_18', label: 'Пн-Пт 9:00–18:00' },
  { id: 'custom', label: 'Свой график' },
];

const STEPS = [
  { id: 1, title: 'Тип бизнеса', subtitle: 'Выберите категорию' },
  { id: 2, title: 'О магазине', subtitle: 'Название и описание' },
  { id: 3, title: 'Адрес', subtitle: 'Где вас найти' },
  { id: 4, title: 'Контакты', subtitle: 'Способы связи' },
  { id: 5, title: 'Доставка', subtitle: 'Варианты получения' },
];

export default function ShopCreationWizardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getAuthToken } = usePlatform();
  const user = useUserStore((state) => state.user);
  const coords = useGeoStore((state) => state.coords);
  const geoCity = useGeoStore((state) => state.cityName);
  const requestLocation = useGeoStore((state) => state.requestLocation);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ShopFormData>(INITIAL_DATA);
  const [isGeoLoading, setIsGeoLoading] = useState(false);

  useEffect(() => {
    if (user?.phone) {
      setFormData(prev => ({
        ...prev,
        contacts: { ...prev.contacts, phone: user.phone || '' }
      }));
    }
    if (user?.username) {
      setFormData(prev => ({
        ...prev,
        contacts: { ...prev.contacts, telegram: user.username || '' }
      }));
    }
  }, [user]);

  useEffect(() => {
    if (geoCity && !formData.city) {
      setFormData(prev => ({ ...prev, city: geoCity }));
    }
    if (coords && !formData.geo) {
      setFormData(prev => ({ ...prev, geo: { lat: coords.lat, lng: coords.lng } }));
    }
  }, [geoCity, coords, formData.city, formData.geo]);

  const submitMutation = useMutation({
    mutationFn: async (data: ShopFormData) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch('/api/seller-profile/shop-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.message || 'Failed to submit request');
      }
      
      return result;
    },
    onSuccess: () => {
      toast({ 
        title: 'Заявка отправлена!', 
        description: 'Ваша заявка будет рассмотрена модератором' 
      });
      navigate('/seller/cabinet');
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Ошибка', 
        description: error.message || 'Не удалось отправить заявку', 
        variant: 'destructive' 
      });
    },
  });

  const handleGeoRequest = async () => {
    setIsGeoLoading(true);
    try {
      await requestLocation();
    } catch (error) {
      console.error('Geo error:', error);
    } finally {
      setIsGeoLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.shopType !== null;
      case 2:
        return formData.name.trim().length >= 2;
      case 3:
        return formData.city.trim().length > 0;
      case 4:
        return formData.contacts.phone.trim().length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      submitMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate(-1);
    }
  };

  const updateField = <K extends keyof ShopFormData>(field: K, value: ShopFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 52,
    padding: '0 16px',
    borderRadius: 14,
    border: '2px solid #E5E7EB',
    background: '#fff',
    fontSize: 16,
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 8,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
        padding: '16px 20px 32px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={handleBack}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 12,
              padding: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={20} color="#fff" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              {STEPS[step - 1].title}
            </h1>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              {STEPS[step - 1].subtitle}
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {step} / 5
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STEPS.map((s) => (
            <div 
              key={s.id}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                background: s.id <= step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        margin: '0 16px',
        marginTop: -16,
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: 20,
        minHeight: 'calc(100vh - 200px)',
        paddingBottom: 120,
      }}>
        {/* Step 1: Shop Type */}
        {step === 1 && (
          <div>
            <p style={{ 
              fontSize: 14, 
              color: '#6B7280', 
              marginBottom: 20,
              lineHeight: 1.5,
            }}>
              Выберите тип вашего бизнеса. Это поможет покупателям найти вас быстрее.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SHOP_TYPES.map((type) => {
                const TypeIcon = type.icon;
                const isSelected = formData.shopType === type.id;
                
                return (
                  <div
                    key={type.id}
                    onClick={() => updateField('shopType', type.id as ShopFormData['shopType'])}
                    style={{
                      background: isSelected ? `${type.color}10` : '#fff',
                      border: `2px solid ${isSelected ? type.color : '#E5E7EB'}`,
                      borderRadius: 16,
                      padding: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    data-testid={`shop-type-${type.id}`}
                  >
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: type.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <TypeIcon size={28} color={type.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                        {type.label}
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280' }}>
                        {type.description}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle size={24} color={type.color} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>
                Название магазина *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Например: Фермерский двор"
                style={inputStyle}
                maxLength={100}
                data-testid="input-name"
              />
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                {formData.name.length}/100 символов
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Расскажите о вашем магазине, что продаёте, чем отличаетесь..."
                rows={4}
                style={{
                  ...inputStyle,
                  height: 'auto',
                  padding: 16,
                  resize: 'none',
                }}
                maxLength={500}
                data-testid="input-description"
              />
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                {formData.description.length}/500 символов
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button
              onClick={handleGeoRequest}
              disabled={isGeoLoading}
              style={{
                width: '100%',
                height: 56,
                background: formData.geo ? '#D1FAE5' : '#F0F7FF',
                border: `2px solid ${formData.geo ? '#10B981' : '#3B73FC'}`,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 15,
                fontWeight: 600,
                color: formData.geo ? '#059669' : '#3B73FC',
                cursor: isGeoLoading ? 'default' : 'pointer',
              }}
              data-testid="button-detect-geo"
            >
              {isGeoLoading ? (
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              ) : formData.geo ? (
                <CheckCircle size={20} />
              ) : (
                <MapPin size={20} />
              )}
              {formData.geo ? 'Местоположение определено' : 'Определить автоматически'}
            </button>

            <div>
              <label style={labelStyle}>Город *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Москва"
                style={inputStyle}
                data-testid="input-city"
              />
            </div>

            <div>
              <label style={labelStyle}>Регион</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => updateField('region', e.target.value)}
                placeholder="Московская область"
                style={inputStyle}
                data-testid="input-region"
              />
            </div>

            <div>
              <label style={labelStyle}>Адрес</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="ул. Примерная, д. 1"
                style={inputStyle}
                data-testid="input-address"
              />
            </div>
          </div>
        )}

        {/* Step 4: Contacts */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={16} color="#3B73FC" />
                Телефон *
              </label>
              <input
                type="tel"
                value={formData.contacts.phone}
                onChange={(e) => updateField('contacts', { ...formData.contacts, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                style={inputStyle}
                data-testid="input-phone"
              />
            </div>

            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={16} color="#0088cc" />
                Telegram
              </label>
              <div style={{ display: 'flex' }}>
                <div style={{
                  height: 52,
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F3F4F6',
                  border: '2px solid #E5E7EB',
                  borderRight: 'none',
                  borderRadius: '14px 0 0 14px',
                  fontSize: 16,
                  color: '#6B7280',
                }}>
                  @
                </div>
                <input
                  type="text"
                  value={formData.contacts.telegram}
                  onChange={(e) => updateField('contacts', { ...formData.contacts, telegram: e.target.value })}
                  placeholder="username"
                  style={{
                    ...inputStyle,
                    borderRadius: '0 14px 14px 0',
                  }}
                  data-testid="input-telegram"
                />
              </div>
            </div>

            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Instagram size={16} color="#E4405F" />
                Instagram
              </label>
              <div style={{ display: 'flex' }}>
                <div style={{
                  height: 52,
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F3F4F6',
                  border: '2px solid #E5E7EB',
                  borderRight: 'none',
                  borderRadius: '14px 0 0 14px',
                  fontSize: 16,
                  color: '#6B7280',
                }}>
                  @
                </div>
                <input
                  type="text"
                  value={formData.contacts.instagram}
                  onChange={(e) => updateField('contacts', { ...formData.contacts, instagram: e.target.value })}
                  placeholder="instagram"
                  style={{
                    ...inputStyle,
                    borderRadius: '0 14px 14px 0',
                  }}
                  data-testid="input-instagram"
                />
              </div>
            </div>

            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={16} color="#6B7280" />
                Сайт
              </label>
              <input
                type="url"
                value={formData.contacts.website}
                onChange={(e) => updateField('contacts', { ...formData.contacts, website: e.target.value })}
                placeholder="https://example.com"
                style={inputStyle}
                data-testid="input-website"
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="#F59E0B" />
                Часы работы
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {WORKING_HOURS_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateField('workingHours', { ...formData.workingHours, preset: preset.id })}
                    style={{
                      width: '100%',
                      padding: 14,
                      background: formData.workingHours.preset === preset.id ? '#F0F7FF' : '#fff',
                      border: `2px solid ${formData.workingHours.preset === preset.id ? '#3B73FC' : '#E5E7EB'}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 500,
                      color: formData.workingHours.preset === preset.id ? '#1D4ED8' : '#374151',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    data-testid={`hours-preset-${preset.id}`}
                  >
                    {preset.label}
                    {formData.workingHours.preset === preset.id && (
                      <Check size={18} color="#3B73FC" />
                    )}
                  </button>
                ))}
              </div>
              
              {formData.workingHours.preset === 'custom' && (
                <input
                  type="text"
                  value={formData.workingHours.customHours}
                  onChange={(e) => updateField('workingHours', { ...formData.workingHours, customHours: e.target.value })}
                  placeholder="Пн-Пт 10:00-19:00, Сб 10:00-16:00"
                  style={{ ...inputStyle, marginTop: 12 }}
                  data-testid="input-custom-hours"
                />
              )}
            </div>
          </div>
        )}

        {/* Step 5: Delivery */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>
              Как покупатели смогут получить заказ?
            </p>

            <div
              onClick={() => updateField('deliveryOptions', { 
                ...formData.deliveryOptions, 
                hasPickup: !formData.deliveryOptions.hasPickup 
              })}
              style={{
                background: formData.deliveryOptions.hasPickup ? '#D1FAE510' : '#fff',
                border: `2px solid ${formData.deliveryOptions.hasPickup ? '#10B981' : '#E5E7EB'}`,
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
              }}
              data-testid="toggle-pickup"
            >
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: '#D1FAE5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Store size={26} color="#10B981" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Самовывоз</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>Покупатели забирают заказ сами</div>
              </div>
              {formData.deliveryOptions.hasPickup && (
                <CheckCircle size={24} color="#10B981" />
              )}
            </div>

            <div
              onClick={() => updateField('deliveryOptions', { 
                ...formData.deliveryOptions, 
                hasDelivery: !formData.deliveryOptions.hasDelivery 
              })}
              style={{
                background: formData.deliveryOptions.hasDelivery ? '#DBEAFE10' : '#fff',
                border: `2px solid ${formData.deliveryOptions.hasDelivery ? '#3B73FC' : '#E5E7EB'}`,
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
              }}
              data-testid="toggle-delivery"
            >
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: '#DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Truck size={26} color="#3B73FC" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Доставка</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>Вы доставляете заказы покупателям</div>
              </div>
              {formData.deliveryOptions.hasDelivery && (
                <CheckCircle size={24} color="#3B73FC" />
              )}
            </div>

            {formData.deliveryOptions.hasDelivery && (
              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>Зона доставки</label>
                <input
                  type="text"
                  value={formData.deliveryOptions.deliveryZone}
                  onChange={(e) => updateField('deliveryOptions', { 
                    ...formData.deliveryOptions, 
                    deliveryZone: e.target.value 
                  })}
                  placeholder="По городу, в пределах 30 км..."
                  style={inputStyle}
                  data-testid="input-delivery-zone"
                />
              </div>
            )}

            <div style={{
              background: '#F0F7FF',
              borderRadius: 16,
              padding: 16,
              marginTop: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Sparkles size={20} color="#3B73FC" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1E40AF', marginBottom: 4 }}>
                    Что будет после отправки?
                  </div>
                  <div style={{ fontSize: 13, color: '#3B82F6', lineHeight: 1.5 }}>
                    Ваша заявка будет рассмотрена модератором. После одобрения магазин станет доступен покупателям. Обычно это занимает 1-2 рабочих дня.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Button */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        background: '#fff',
        borderTop: '1px solid #E5E7EB',
      }}>
        <button
          onClick={handleNext}
          disabled={!canProceed() || submitMutation.isPending}
          style={{
            width: '100%',
            height: 56,
            background: canProceed() && !submitMutation.isPending 
              ? 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)' 
              : '#E5E7EB',
            color: canProceed() && !submitMutation.isPending ? '#fff' : '#9CA3AF',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 600,
            cursor: canProceed() && !submitMutation.isPending ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          data-testid="button-next"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Отправка...
            </>
          ) : step === 5 ? (
            <>
              <Check size={20} />
              Отправить заявку
            </>
          ) : (
            <>
              Далее
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
