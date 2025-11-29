import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, X, Image, Video, Check, 
  Link2, Eye, AlertCircle, Loader2, Trash2
} from 'lucide-react';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';
import { usePlatform } from '@/platform/PlatformProvider';
import { useToast } from '@/hooks/use-toast';
import ScreenLayout from '@/components/layout/ScreenLayout';

interface StoryItem {
  type: 'image' | 'video';
  file: File;
  preview: string;
  duration: number;
}

interface AdOption {
  _id: string;
  title: string;
  price: number;
  photos: string[];
}

interface MyStory {
  _id: string;
  items: Array<{
    type: 'image' | 'video';
    mediaUrl: string;
    thumbnailUrl?: string;
    duration: number;
  }>;
  linkedAdId?: {
    _id: string;
    title: string;
  };
  caption?: string;
  publishedAt: string;
  expiresAt: string;
  viewsCount: number;
  completedViewsCount: number;
  productClicksCount: number;
}

const STORY_DURATION_HOURS = 24;
const MAX_ITEMS = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export default function StoryCreatorPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const { getAuthToken } = usePlatform();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<StoryItem[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [showAdSelector, setShowAdSelector] = useState(false);
  const [myAds, setMyAds] = useState<AdOption[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  
  const [myStories, setMyStories] = useState<MyStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMyStories();
    loadMyAds();
  }, []);

  const loadMyStories = async () => {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await http.get('/api/stories/my/list', { headers });
      if (res.data.success) {
        setMyStories(res.data.stories || []);
      }
    } catch (err) {
      console.error('[StoryCreator] Load stories error:', err);
    } finally {
      setStoriesLoading(false);
    }
  };

  const loadMyAds = async () => {
    if (!user?.telegramId) return;
    setAdsLoading(true);

    try {
      const res = await http.get(`/api/farmer/dashboard-ads?sellerTelegramId=${user.telegramId}`);
      if (res.data.success) {
        const activeAds = res.data.data.ads
          .filter((ad: any) => ad.displayStatus === 'active')
          .map((ad: any) => ({
            _id: ad._id,
            title: ad.title,
            price: ad.price,
            photos: ad.photos || [],
          }));
        setMyAds(activeAds);
      }
    } catch (err) {
      console.error('[StoryCreator] Load ads error:', err);
    } finally {
      setAdsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setError(null);

    const newItems: StoryItem[] = [];
    
    for (const file of Array.from(files)) {
      if (items.length + newItems.length >= MAX_ITEMS) {
        setError(`Максимум ${MAX_ITEMS} файлов`);
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('Файл слишком большой (макс 50 МБ)');
        continue;
      }

      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        setError('Неподдерживаемый формат файла');
        continue;
      }

      const preview = URL.createObjectURL(file);
      newItems.push({
        type: isVideo ? 'video' : 'image',
        file,
        preview,
        duration: isVideo ? 15000 : 5000,
      });
    }

    setItems([...items, ...newItems]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    URL.revokeObjectURL(newItems[index].preview);
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const uploadMedia = async (item: StoryItem): Promise<string> => {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fileExtension = item.file.name.split('.').pop()?.toLowerCase() || (item.type === 'video' ? 'mp4' : 'jpg');
    
    const presignRes = await http.post('/api/uploads/story/presigned-url', {
      fileExtension,
      mimeType: item.file.type,
      size: item.file.size,
      type: item.type,
    }, { headers });
    
    if (!presignRes.data.success) {
      throw new Error(presignRes.data.error || 'Failed to get upload URL');
    }

    const { uploadURL, url: publicURL, fileId } = presignRes.data;

    await fetch(uploadURL, {
      method: 'PUT',
      body: item.file,
      headers: {
        'Content-Type': item.file.type,
      },
    });

    await http.post(`/api/uploads/${fileId}/complete`, {}, { headers });

    return publicURL;
  };

  const handlePublish = async () => {
    if (items.length === 0) {
      setError('Добавьте хотя бы один файл');
      toast({ title: 'Добавьте хотя бы один файл', variant: 'destructive' });
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      setUploading(true);
      
      const uploadedItems: Array<{
        type: 'image' | 'video';
        mediaUrl: string;
        thumbnailUrl?: string;
        duration: number;
        aspectRatio: number;
      }> = [];
      
      for (const item of items) {
        try {
          const mediaUrl = await uploadMedia(item);
          uploadedItems.push({
            type: item.type,
            mediaUrl,
            duration: item.duration,
            aspectRatio: 0.5625,
          });
        } catch (uploadErr: any) {
          console.error('[StoryCreator] Upload error for item:', uploadErr);
          toast({ 
            title: 'Ошибка загрузки файла', 
            description: uploadErr.message || 'Не удалось загрузить медиафайл',
            variant: 'destructive' 
          });
          throw uploadErr;
        }
      }
      
      setUploading(false);

      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await http.post('/api/stories', {
        items: uploadedItems,
        linkedAdId: selectedAdId || undefined,
        caption: caption.trim() || undefined,
      }, { headers });

      if (res.data.success) {
        items.forEach(item => URL.revokeObjectURL(item.preview));
        setItems([]);
        setCaption('');
        setSelectedAdId(null);
        
        toast({ 
          title: 'История опубликована!', 
          description: 'Ваша история доступна 24 часа' 
        });
        
        loadMyStories();
        navigate('/profile');
      } else {
        if (res.data.error === 'seller_required') {
          toast({ 
            title: 'Требуется профиль продавца', 
            description: 'Только продавцы могут создавать истории',
            variant: 'destructive' 
          });
          setError('Только продавцы могут создавать истории');
        } else {
          throw new Error(res.data.error || res.data.message || 'Publish failed');
        }
      }
    } catch (err: any) {
      console.error('[StoryCreator] Publish error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Ошибка публикации';
      
      if (err.response?.data?.error === 'seller_required') {
        toast({ 
          title: 'Требуется профиль продавца', 
          description: 'Только продавцы могут создавать истории',
          variant: 'destructive' 
        });
        setError('Только продавцы могут создавать истории');
      } else {
        toast({ 
          title: 'Ошибка публикации', 
          description: errorMessage,
          variant: 'destructive' 
        });
        setError(errorMessage);
      }
    } finally {
      setPublishing(false);
      setUploading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await http.delete(`/api/stories/${storyId}`, { headers });
      setMyStories(myStories.filter(s => s._id !== storyId));
      toast({ title: 'История удалена' });
    } catch (err) {
      console.error('[StoryCreator] Delete error:', err);
      toast({ title: 'Не удалось удалить историю', variant: 'destructive' });
    }
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Истекла';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}ч ${diffMins}м`;
    }
    return `${diffMins} мин`;
  };

  const selectedAd = myAds.find(ad => ad._id === selectedAdId);

  return (
    <ScreenLayout>
      <div style={{ background: '#F9FAFB', minHeight: '100%' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
            padding: '16px',
            paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </button>
          <h1 style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 600, margin: 0 }}>
            Истории
          </h1>
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1F2937' }}>
              Создать историю
            </h2>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  paddingBottom: 8,
                }}
              >
                {items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      width: 80,
                      height: 120,
                      borderRadius: 12,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#F3F4F6',
                    }}
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.preview}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <img
                        src={item.preview}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    )}
                    <button
                      onClick={() => removeItem(index)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      data-testid={`button-remove-item-${index}`}
                    >
                      <X size={14} color="#FFFFFF" />
                    </button>
                    {item.type === 'video' && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: 4,
                          background: 'rgba(0,0,0,0.5)',
                          borderRadius: 4,
                          padding: '2px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Video size={12} color="#FFFFFF" />
                      </div>
                    )}
                  </div>
                ))}

                {items.length < MAX_ITEMS && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 80,
                      height: 120,
                      borderRadius: 12,
                      border: '2px dashed #D1D5DB',
                      background: '#F9FAFB',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    data-testid="button-add-media"
                  >
                    <Plus size={24} color="#9CA3AF" />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>Добавить</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                data-testid="input-file"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#6B7280', marginBottom: 6, display: 'block' }}>
                Подпись (необязательно)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                placeholder="Добавьте описание..."
                style={{
                  width: '100%',
                  minHeight: 60,
                  padding: 12,
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  resize: 'none',
                  fontSize: 14,
                  fontFamily: 'inherit',
                }}
                data-testid="textarea-caption"
              />
              <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
                {caption.length}/200
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#6B7280', marginBottom: 6, display: 'block' }}>
                Привязать товар (необязательно)
              </label>
              
              {selectedAd ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: '#F3F4F6',
                    borderRadius: 12,
                  }}
                >
                  {selectedAd.photos?.[0] && (
                    <img
                      src={selectedAd.photos[0]}
                      alt=""
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedAd.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>
                      {selectedAd.price} BYN
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAdId(null)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: 'none',
                      background: '#E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    data-testid="button-remove-linked-ad"
                  >
                    <X size={16} color="#6B7280" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAdSelector(true)}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '1px dashed #D1D5DB',
                    borderRadius: 12,
                    background: '#F9FAFB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#6B7280',
                  }}
                  data-testid="button-select-ad"
                >
                  <Link2 size={18} />
                  Выбрать товар
                </button>
              )}
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 12,
                  background: '#FEE2E2',
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={18} color="#DC2626" />
                <span style={{ fontSize: 13, color: '#DC2626' }}>{error}</span>
              </div>
            )}

            <button
              onClick={handlePublish}
              disabled={publishing || items.length === 0}
              style={{
                width: '100%',
                padding: 14,
                background: items.length === 0 ? '#E5E7EB' : '#3B73FC',
                color: items.length === 0 ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              data-testid="button-publish-story"
            >
              {publishing ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  {uploading ? 'Загрузка...' : 'Публикация...'}
                </>
              ) : (
                <>
                  <Check size={18} />
                  Опубликовать историю
                </>
              )}
            </button>

            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                История будет доступна {STORY_DURATION_HOURS} часов
              </span>
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1F2937' }}>
              Мои истории
            </h2>

            {storiesLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Loader2 size={24} color="#9CA3AF" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : myStories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#9CA3AF' }}>
                <Image size={32} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14 }}>У вас пока нет историй</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myStories.map((story) => (
                  <div
                    key={story._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: '#F9FAFB',
                      borderRadius: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 84,
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#E5E7EB',
                        flexShrink: 0,
                      }}
                    >
                      {story.items[0]?.type === 'video' ? (
                        <video
                          src={story.items[0].mediaUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : story.items[0] && (
                        <img
                          src={story.items[0].mediaUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#1F2937', fontWeight: 500 }}>
                          {story.items.length} {story.items.length === 1 ? 'элемент' : 'элементов'}
                        </span>
                        <span style={{ fontSize: 12, color: '#10B981', fontWeight: 500 }}>
                          {getTimeRemaining(story.expiresAt)}
                        </span>
                      </div>
                      
                      {story.linkedAdId && (
                        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🔗 {story.linkedAdId.title}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#9CA3AF' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye size={14} /> {story.viewsCount}
                        </span>
                        {story.productClicksCount > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            🛒 {story.productClicksCount}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteStory(story._id)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      data-testid={`button-delete-story-${story._id}`}
                    >
                      <Trash2 size={16} color="#DC2626" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdSelector && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowAdSelector(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              width: '100%',
              maxHeight: '70vh',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 16, borderBottom: '1px solid #E5E7EB' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Выберите товар</h3>
            </div>
            
            <div style={{ padding: 16, overflowY: 'auto', maxHeight: 'calc(70vh - 60px)' }}>
              {adsLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Loader2 size={24} color="#9CA3AF" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : myAds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#9CA3AF' }}>
                  Нет активных объявлений
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myAds.map((ad) => (
                    <button
                      key={ad._id}
                      onClick={() => {
                        setSelectedAdId(ad._id);
                        setShowAdSelector(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: selectedAdId === ad._id ? '#EEF2FF' : '#F9FAFB',
                        border: selectedAdId === ad._id ? '2px solid #3B73FC' : 'none',
                        borderRadius: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                      data-testid={`ad-option-${ad._id}`}
                    >
                      {ad.photos?.[0] && (
                        <img
                          src={ad.photos[0]}
                          alt=""
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ad.title}
                        </div>
                        <div style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>
                          {ad.price} BYN
                        </div>
                      </div>
                      {selectedAdId === ad._id && (
                        <Check size={20} color="#3B73FC" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </ScreenLayout>
  );
}
