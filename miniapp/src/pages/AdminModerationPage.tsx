import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Search, CheckCircle, XCircle, 
  Eye, Trash2, RefreshCw, Package, Loader2, 
  AlertTriangle, Clock, Ban, FileText, Send, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';
import { getThumbnailUrl } from '@/constants/placeholders';

interface AdOwner {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  telegramId?: number;
}

interface ModerationAd {
  _id: string;
  title: string;
  price?: number;
  currency?: string;
  status: string;
  moderationStatus: string;
  moderationComment?: string;
  photos?: string[];
  previewUrl?: string;
  location?: { label?: string; city?: string; district?: string };
  createdAt: string;
  owner?: AdOwner;
  sellerTelegramId?: number;
  views?: number;
}

interface AdsResponse {
  ads: ModerationAd[];
  total: number;
  page: number;
  totalPages: number;
}

type FilterType = 'all' | 'active' | 'pending' | 'rejected' | 'hidden' | 'blocked';

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  active: { bg: '#D1FAE5', text: '#059669', label: 'Активно', icon: CheckCircle },
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'На модерации', icon: Clock },
  rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'Отклонено', icon: XCircle },
  hidden: { bg: '#F3F4F6', text: '#6B7280', label: 'Скрыто', icon: Ban },
  blocked: { bg: '#FEE2E2', text: '#DC2626', label: 'Заблокировано', icon: AlertTriangle },
  draft: { bg: '#E0E7FF', text: '#4338CA', label: 'Черновик', icon: FileText },
  archived: { bg: '#F3F4F6', text: '#6B7280', label: 'В архиве', icon: Package },
};

const moderationStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: '#D1FAE5', text: '#059669', label: 'Одобрено' },
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'Ожидает' },
  rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'Отклонено' },
};

export default function AdminModerationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getAuthToken } = usePlatform();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectModalAd, setRejectModalAd] = useState<ModerationAd | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [deleteConfirmAd, setDeleteConfirmAd] = useState<ModerationAd | null>(null);

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/admin/ads', filter, searchQuery, currentPage],
    queryFn: async () => {
      console.log('[AdminModeration] Loading ads...');
      const token = await getAuthToken();
      console.log('[AdminModeration] Token:', !!token, token?.substring(0, 20));
      if (!token) throw new Error('Not authenticated');
      
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '20');
      
      if (filter === 'pending') {
        params.set('moderationStatus', 'pending');
      } else if (filter === 'rejected') {
        params.set('moderationStatus', 'rejected');
      } else if (filter !== 'all') {
        params.set('status', filter);
      }
      
      if (searchQuery) params.set('search', searchQuery);
      
      console.log('[AdminModeration] Fetching:', `/api/admin/ads?${params}`);
      const res = await fetch(`/api/admin/ads?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('[AdminModeration] Response status:', res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error('[AdminModeration] Error:', errText);
        throw new Error('Failed to load ads');
      }
      const result = await res.json();
      console.log('[AdminModeration] Loaded:', result.ads?.length, 'ads, total:', result.total);
      return result as AdsResponse;
    },
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ adId, permanent }: { adId: string; permanent: boolean }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/admin/ads/${adId}?permanent=${permanent}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete ad');
      return res.json();
    },
    onSuccess: (_, { permanent }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads'] });
      toast({ 
        title: permanent ? 'Объявление удалено навсегда' : 'Объявление архивировано',
      });
      setDeleteConfirmAd(null);
    },
    onError: () => {
      toast({ title: 'Ошибка при удалении', variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ adId, comment }: { adId: string; comment: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/mod/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adId, comment }),
      });
      if (!res.ok) throw new Error('Failed to reject ad');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads'] });
      toast({ title: 'Объявление отправлено на доработку' });
      setRejectModalAd(null);
      setRejectComment('');
    },
    onError: () => {
      toast({ title: 'Ошибка', variant: 'destructive' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (adId: string) => {
      console.log('[Moderation] Approving ad:', adId);
      const token = await getAuthToken();
      console.log('[Moderation] Token received:', !!token);
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/mod/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adId }),
      });
      console.log('[Moderation] Response status:', res.status);
      if (!res.ok) {
        const err = await res.text();
        console.error('[Moderation] Error:', err);
        throw new Error('Failed to approve ad');
      }
      return res.json();
    },
    onSuccess: () => {
      console.log('[Moderation] Success!');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads'] });
      toast({ title: 'Объявление одобрено' });
    },
    onError: (error) => {
      console.error('[Moderation] Mutation error:', error);
      toast({ title: 'Ошибка', variant: 'destructive' });
    },
  });

  const ads: ModerationAd[] = data?.ads || [];
  const totalPages = data?.totalPages || 1;

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'active', label: 'Активные' },
    { id: 'pending', label: 'На модерации' },
    { id: 'rejected', label: 'Отклонённые' },
    { id: 'hidden', label: 'Скрытые' },
    { id: 'blocked', label: 'Заблокированы' },
  ];

  const getAdStatus = (ad: ModerationAd) => {
    if (ad.status === 'blocked') return statusConfig.blocked;
    if (ad.status === 'hidden') return statusConfig.hidden;
    if (ad.status === 'archived') return statusConfig.archived;
    if (ad.moderationStatus === 'pending') return statusConfig.pending;
    if (ad.moderationStatus === 'rejected') return statusConfig.rejected;
    if (ad.status === 'active') return statusConfig.active;
    return statusConfig.draft;
  };

  const getOwnerName = (ad: ModerationAd) => {
    if (ad.owner) {
      const name = [ad.owner.firstName, ad.owner.lastName].filter(Boolean).join(' ');
      if (name) return name;
      if (ad.owner.username) return `@${ad.owner.username}`;
      if (ad.owner.phone) return ad.owner.phone;
    }
    if (ad.sellerTelegramId) return `TG: ${ad.sellerTelegramId}`;
    return 'Неизвестно';
  };

  const getAdImage = (ad: ModerationAd) => {
    if (ad.previewUrl) return getThumbnailUrl(ad.previewUrl);
    if (ad.photos && ad.photos.length > 0) return getThumbnailUrl(ad.photos[0]);
    return null;
  };

  const getLocation = (ad: ModerationAd) => {
    if (ad.location?.city) return ad.location.city;
    if (ad.location?.label) return ad.location.label;
    return null;
  };

  const handleReject = () => {
    if (!rejectModalAd) return;
    rejectMutation.mutate({ 
      adId: rejectModalAd._id, 
      comment: rejectComment || 'Требуется доработка' 
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
        padding: '16px 20px 40px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 40,
              height: 40,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              borderRadius: 12,
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
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              Модерация объявлений
            </h1>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 2 }}>
              {data?.total || 0} объявлений
            </div>
          </div>
          <button
            onClick={() => refetch()}
            style={{
              width: 40,
              height: 40,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            data-testid="button-refresh"
          >
            <RefreshCw size={20} color="#fff" />
          </button>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div style={{ 
        margin: '0 16px',
        marginTop: -24,
        background: '#fff',
        borderRadius: 20,
        padding: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={18} color="#9CA3AF" style={{ 
            position: 'absolute', 
            left: 14, 
            top: '50%', 
            transform: 'translateY(-50%)' 
          }} />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              height: 48,
              paddingLeft: 44,
              paddingRight: 16,
              borderRadius: 12,
              border: '2px solid #E5E7EB',
              fontSize: 15,
              outline: 'none',
              background: '#F9FAFB',
              boxSizing: 'border-box',
            }}
            data-testid="input-search"
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setCurrentPage(1);
              }}
              style={{
                padding: '10px 16px',
                background: filter === f.id 
                  ? 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)' 
                  : '#F3F4F6',
                color: filter === f.id ? '#fff' : '#374151',
                border: 'none',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                boxShadow: filter === f.id ? '0 4px 12px rgba(59, 115, 252, 0.3)' : 'none',
              }}
              data-testid={`filter-${f.id}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16, paddingBottom: 100 }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                background: '#fff',
                borderRadius: 20,
                height: 160,
                animation: 'pulse 2s infinite',
              }} />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: 24,
            padding: 48,
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Package size={36} color="#fff" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Объявления не найдены
            </div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>
              {searchQuery ? 'Попробуйте изменить параметры поиска' : 'Нет объявлений для отображения'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ads.map((ad) => {
              const status = getAdStatus(ad);
              const StatusIcon = status.icon;
              const imageUrl = getAdImage(ad);
              const location = getLocation(ad);
              
              return (
                <div
                  key={ad._id}
                  style={{
                    background: '#fff',
                    borderRadius: 20,
                    padding: 16,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  }}
                  data-testid={`card-ad-${ad._id}`}
                >
                  <div style={{ display: 'flex', gap: 14 }}>
                    {/* Image */}
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: 16,
                      background: imageUrl 
                        ? `url(${imageUrl}) center/cover`
                        : 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {!imageUrl && <Package size={32} color="#9CA3AF" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title and status */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6,
                      }}>
                        <div style={{ 
                          fontSize: 16, 
                          fontWeight: 700, 
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {ad.title}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: status.bg,
                          color: status.text,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: 8,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          <StatusIcon size={10} />
                          {status.label}
                        </div>
                      </div>

                      {/* Price */}
                      {ad.price !== undefined && (
                        <div style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: '#3B73FC',
                          marginBottom: 6,
                        }}>
                          {ad.price.toLocaleString('ru-RU')} {ad.currency || 'BYN'}
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ 
                        fontSize: 12, 
                        color: '#6B7280',
                        marginBottom: 4,
                      }}>
                        <span>Владелец: {getOwnerName(ad)}</span>
                        {location && <span> • {location}</span>}
                      </div>

                      {/* Moderation comment */}
                      {ad.moderationComment && (
                        <div style={{
                          fontSize: 11,
                          color: '#DC2626',
                          background: '#FEE2E2',
                          padding: '6px 10px',
                          borderRadius: 8,
                          marginBottom: 8,
                        }}>
                          Причина: {ad.moderationComment}
                        </div>
                      )}

                      {/* Views */}
                      <div style={{ 
                        fontSize: 11, 
                        color: '#9CA3AF',
                        marginBottom: 10,
                      }}>
                        👁 {ad.views || 0} просмотров • {new Date(ad.createdAt).toLocaleDateString('ru-RU')}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => navigate(`/ads/${ad._id}`)}
                          style={{
                            height: 36,
                            padding: '0 12px',
                            background: '#F3F4F6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            cursor: 'pointer',
                          }}
                          data-testid={`button-view-${ad._id}`}
                        >
                          <Eye size={14} />
                          Открыть
                        </button>
                        
                        {ad.moderationStatus === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('[Moderation] Approve clicked for:', ad._id);
                              approveMutation.mutate(ad._id);
                            }}
                            disabled={approveMutation.isPending}
                            style={{
                              height: 36,
                              padding: '0 12px',
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              cursor: 'pointer',
                              opacity: approveMutation.isPending ? 0.7 : 1,
                            }}
                            data-testid={`button-approve-${ad._id}`}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <>
                                <CheckCircle size={14} />
                                Одобрить
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRejectModalAd(ad);
                          }}
                          style={{
                            height: 36,
                            padding: '0 12px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            cursor: 'pointer',
                          }}
                          data-testid={`button-reject-${ad._id}`}
                        >
                          <Send size={14} />
                          На доработку
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmAd(ad);
                          }}
                          style={{
                            height: 36,
                            padding: '0 12px',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            cursor: 'pointer',
                          }}
                          data-testid={`button-delete-${ad._id}`}
                        >
                          <Trash2 size={14} />
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginTop: 16,
              }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '10px 16px',
                    background: currentPage === 1 ? '#E5E7EB' : '#3B73FC',
                    color: currentPage === 1 ? '#9CA3AF' : '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                  data-testid="button-prev-page"
                >
                  Назад
                </button>
                <div style={{
                  padding: '10px 16px',
                  background: '#F3F4F6',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                }}>
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '10px 16px',
                    background: currentPage === totalPages ? '#E5E7EB' : '#3B73FC',
                    color: currentPage === totalPages ? '#9CA3AF' : '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                  data-testid="button-next-page"
                >
                  Вперёд
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalAd && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 24,
            padding: 24,
            maxWidth: 400,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827' }}>
                Отправить на доработку
              </h3>
              <button
                onClick={() => {
                  setRejectModalAd(null);
                  setRejectComment('');
                }}
                style={{
                  width: 32,
                  height: 32,
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="#6B7280" />
              </button>
            </div>
            
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
              Объявление: <strong>{rejectModalAd.title}</strong>
            </div>
            
            <textarea
              placeholder="Укажите причину отклонения..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              style={{
                width: '100%',
                height: 100,
                padding: 14,
                borderRadius: 12,
                border: '2px solid #E5E7EB',
                fontSize: 14,
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              data-testid="textarea-reject-reason"
            />
            
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => {
                  setRejectModalAd(null);
                  setRejectComment('');
                }}
                style={{
                  flex: 1,
                  height: 48,
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                data-testid="button-cancel-reject"
              >
                Отмена
              </button>
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                style={{
                  flex: 1,
                  height: 48,
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: rejectMutation.isPending ? 0.7 : 1,
                }}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  'Отправить'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmAd && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 24,
            padding: 24,
            maxWidth: 400,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Trash2 size={32} color="#DC2626" />
            </div>
            
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#111827', textAlign: 'center' }}>
              Удалить объявление?
            </h3>
            
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 20, textAlign: 'center' }}>
              <strong>{deleteConfirmAd.title}</strong>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => deleteMutation.mutate({ adId: deleteConfirmAd._id, permanent: false })}
                disabled={deleteMutation.isPending}
                style={{
                  height: 48,
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                data-testid="button-archive"
              >
                В архив (можно восстановить)
              </button>
              <button
                onClick={() => deleteMutation.mutate({ adId: deleteConfirmAd._id, permanent: true })}
                disabled={deleteMutation.isPending}
                style={{
                  height: 48,
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                data-testid="button-delete-permanent"
              >
                {deleteMutation.isPending ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  'Удалить навсегда'
                )}
              </button>
              <button
                onClick={() => setDeleteConfirmAd(null)}
                style={{
                  height: 48,
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                data-testid="button-cancel-delete"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
