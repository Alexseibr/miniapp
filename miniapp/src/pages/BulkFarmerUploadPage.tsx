import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Upload, Image, Loader2, CheckCircle, Share2, Eye, ArrowLeft } from 'lucide-react';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';

interface BulkItem {
  id: string;
  title: string;
  description: string;
  price: string;
  unit: string;
  quantity: string;
  photo: string | null;
  uploading: boolean;
  categoryId?: string;
  categoryName?: string;
  freshness: 'today' | 'yesterday' | 'custom' | null;
  customDate?: string;
  isOrganic: boolean;
}

interface UploadResult {
  created: number;
  errors: string[];
  ads: Array<{ _id: string; title: string }>;
}

const UNITS = [
  { value: 'kg', label: 'кг' },
  { value: 'g', label: 'г' },
  { value: 'piece', label: 'штука' },
  { value: 'liter', label: 'литр' },
  { value: 'pack', label: 'упаковка' },
  { value: 'jar', label: 'банка' },
  { value: 'bunch', label: 'пучок' },
  { value: 'bag', label: 'мешок' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function BulkFarmerUploadPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [items, setItems] = useState<BulkItem[]>([createEmptyItem()]);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  function createEmptyItem(): BulkItem {
    return {
      id: generateId(),
      title: '',
      description: '',
      price: '',
      unit: 'kg',
      quantity: '1',
      photo: null,
      uploading: false,
      freshness: 'today',
      customDate: undefined,
      isOrganic: false,
    };
  }

  const addItem = useCallback(() => {
    if (items.length >= 10) return;
    setItems((prev) => [...prev, createEmptyItem()]);
  }, [items.length]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<BulkItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const handlePhotoUpload = useCallback(async (itemId: string, file: File) => {
    updateItem(itemId, { uploading: true });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const { data } = await http.post('/api/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      updateItem(itemId, { photo: data.url, uploading: false });
    } catch (error) {
      console.error('Upload failed:', error);
      updateItem(itemId, { uploading: false });
    }
  }, [updateItem]);

  const handleAutoCategory = useCallback(async (itemId: string, title: string) => {
    if (!title || title.length < 3) return;
    
    try {
      const { data } = await http.post('/api/farmer/suggest-category', { title });
      if (data.suggested) {
        updateItem(itemId, { 
          categoryId: data.suggested._id, 
          categoryName: data.suggested.name 
        });
      }
    } catch (error) {
      console.error('Category suggest failed:', error);
    }
  }, [updateItem]);

  const validateItems = useCallback(() => {
    const errors: string[] = [];
    items.forEach((item, index) => {
      if (!item.title.trim()) {
        errors.push(`Товар ${index + 1}: укажите название`);
      }
      if (!item.price || parseFloat(item.price) <= 0) {
        errors.push(`Товар ${index + 1}: укажите цену`);
      }
    });
    return errors;
  }, [items]);

  const getHarvestDate = (item: BulkItem): string | null => {
    if (!item.freshness) return null;
    const now = new Date();
    switch (item.freshness) {
      case 'today':
        return now.toISOString();
      case 'yesterday':
        now.setDate(now.getDate() - 1);
        return now.toISOString();
      case 'custom':
        return item.customDate || null;
      default:
        return null;
    }
  };

  const handlePublish = useCallback(async () => {
    const errors = validateItems();
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    setPublishing(true);
    
    try {
      const payload = {
        ads: items.map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          price: parseFloat(item.price),
          unitType: item.unit,
          quantity: parseFloat(item.quantity) || 1,
          subcategoryId: item.categoryId,
          photos: item.photo ? [item.photo] : [],
          harvestDate: getHarvestDate(item),
          isOrganic: item.isOrganic,
        })),
        sellerTelegramId: user?.telegramId,
        lat: user?.location?.lat,
        lng: user?.location?.lng,
      };

      const { data } = await http.post('/api/farmer/bulk-ads', payload);
      setResult(data.data);
    } catch (error) {
      console.error('Bulk upload failed:', error);
      alert('Ошибка при публикации. Попробуйте снова.');
    } finally {
      setPublishing(false);
    }
  }, [items, validateItems, user]);

  const handleShare = useCallback((adId: string) => {
    const adUrl = `${window.location.origin}/ads/${adId}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(adUrl)}`);
    } else if (navigator.share) {
      navigator.share({ url: adUrl });
    } else {
      navigator.clipboard.writeText(adUrl);
      alert('Ссылка скопирована!');
    }
  }, []);

  if (!user) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Войдите, чтобы добавить товары</p>
      </div>
    );
  }

  // Success screen
  if (result) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#F8FAFC', 
        padding: 20,
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <CheckCircle size={40} color="#fff" />
          </div>
          
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
            {result.created} {result.created === 1 ? 'товар опубликован' : 'товаров опубликовано'}
          </h1>
          
          {result.errors.length > 0 && (
            <p style={{ color: '#DC2626', margin: '0 0 20px' }}>
              {result.errors.length} ошибок при загрузке
            </p>
          )}

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.ads.map((ad) => (
              <div
                key={ad._id}
                style={{
                  background: '#F9FAFB',
                  borderRadius: 14,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 15, color: '#374151', flex: 1, textAlign: 'left' }}>
                  {ad.title}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/ads/${ad._id}`)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: '#EBF3FF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    data-testid={`view-ad-${ad._id}`}
                  >
                    <Eye size={18} color="#3B73FC" />
                  </button>
                  <button
                    onClick={() => handleShare(ad._id)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: '#3B73FC',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    data-testid={`share-ad-${ad._id}`}
                  >
                    <Share2 size={18} color="#fff" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
            <button
              onClick={() => {
                setResult(null);
                setItems([createEmptyItem()]);
              }}
              style={{
                flex: 1,
                padding: '14px',
                background: '#FFFFFF',
                color: '#3B73FC',
                border: '2px solid #3B73FC',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              data-testid="button-add-more"
            >
              Добавить ещё
            </button>
            <button
              onClick={() => navigate('/farmer-feed')}
              style={{
                flex: 1,
                padding: '14px',
                background: '#3B73FC',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              data-testid="button-view-feed"
            >
              Мои товары
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#F8FAFC',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <header style={{
        background: '#FFFFFF',
        padding: '16px 20px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: '#F3F4F6',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-testid="button-back"
        >
          <ArrowLeft size={20} color="#374151" />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
            Добавить товары
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            До {10 - items.length} товаров можно добавить
          </p>
        </div>
      </header>

      {/* Items List */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((item, index) => (
          <div
            key={item.id}
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: 20,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}
          >
            {/* Item Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>
                Товар {index + 1}
              </span>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#FEE2E2',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  data-testid={`remove-item-${index}`}
                >
                  <Trash2 size={18} color="#DC2626" />
                </button>
              )}
            </div>

            {/* Photo Upload */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '16/9',
                  background: item.photo ? `url(${item.photo}) center/cover` : '#F3F4F6',
                  borderRadius: 14,
                  cursor: 'pointer',
                  border: '2px dashed #D1D5DB',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {!item.photo && !item.uploading && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    color: '#6B7280',
                  }}>
                    <Image size={32} />
                    <span style={{ fontSize: 14 }}>Добавить фото</span>
                  </div>
                )}
                {item.uploading && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.8)',
                  }}>
                    <Loader2 size={32} color="#3B73FC" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(item.id, file);
                  }}
                  data-testid={`photo-input-${index}`}
                />
              </label>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                onBlur={(e) => handleAutoCategory(item.id, e.target.value)}
                placeholder="Название товара"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 16,
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  background: '#FAFAFA',
                  outline: 'none',
                }}
                data-testid={`title-input-${index}`}
              />
              {item.categoryName && (
                <div style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <CheckCircle size={12} />
                  Категория: {item.categoryName}
                </div>
              )}
            </div>

            {/* Price + Unit */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <input
                type="number"
                value={item.price}
                onChange={(e) => updateItem(item.id, { price: e.target.value })}
                placeholder="Цена"
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  fontSize: 16,
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  background: '#FAFAFA',
                  outline: 'none',
                }}
                data-testid={`price-input-${index}`}
              />
              <select
                value={item.unit}
                onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                style={{
                  width: 110,
                  padding: '14px 12px',
                  fontSize: 15,
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  background: '#FAFAFA',
                  outline: 'none',
                  cursor: 'pointer',
                }}
                data-testid={`unit-select-${index}`}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <textarea
              value={item.description}
              onChange={(e) => updateItem(item.id, { description: e.target.value })}
              placeholder="Описание (необязательно)"
              rows={2}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 15,
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                background: '#FAFAFA',
                outline: 'none',
                resize: 'none',
              }}
              data-testid={`description-input-${index}`}
            />
          </div>
        ))}

        {/* Add Item Button */}
        {items.length < 10 && (
          <button
            onClick={addItem}
            style={{
              width: '100%',
              padding: '18px',
              background: '#FFFFFF',
              color: '#3B73FC',
              border: '2px dashed #3B73FC',
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            data-testid="button-add-item"
          >
            <Plus size={20} />
            Добавить товар
          </button>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}>
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            width: '100%',
            padding: '16px',
            background: publishing ? '#9CA3AF' : '#3B73FC',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 600,
            cursor: publishing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            minHeight: 54,
          }}
          data-testid="button-publish-all"
        >
          {publishing ? (
            <>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Публикуем...
            </>
          ) : (
            <>
              <Upload size={20} />
              Опубликовать {items.length} {items.length === 1 ? 'товар' : 'товаров'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
