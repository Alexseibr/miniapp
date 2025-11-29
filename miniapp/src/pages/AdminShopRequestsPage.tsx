import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, ArrowLeft, Search, CheckCircle, XCircle, 
  Store, Tractor, Loader2, RefreshCw, MapPin,
  Phone, Clock, Package, Send, Globe, X
} from 'lucide-react';
import { FaTelegram, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';
import { getThumbnailUrl } from '@/constants/placeholders';
import { useUserStore } from '@/store/useUserStore';

interface ShopRequest {
  _id: string;
  userId: {
    _id: string;
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  telegramId: number;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  shopType: 'farmer' | 'shop' | 'service';
  description?: string;
  city?: string;
  region?: string;
  address?: string;
  contacts: {
    phone: string;
    telegram?: string;
    whatsapp?: string;
    instagram?: string;
    website?: string;
  };
  workingHours?: {
    preset?: string;
    customHours?: string;
  };
  avatar?: string;
  banner?: string;
  photos?: string[];
  deliveryOptions?: {
    hasDelivery?: boolean;
    hasPickup?: boolean;
    deliveryZone?: string;
  };
  categories?: string[];
  rejectReason?: string;
  createdAt: string;
}

type FilterType = 'pending' | 'approved' | 'rejected' | 'all';

const shopTypeLabels: Record<string, { label: string; color: string; bgColor: string; icon: typeof Store }> = {
  farmer: { label: 'Фермер', color: '#059669', bgColor: '#D1FAE5', icon: Tractor },
  shop: { label: 'Магазин', color: '#3B73FC', bgColor: '#DBEAFE', icon: Store },
  service: { label: 'Услуги', color: '#8B5CF6', bgColor: '#EDE9FE', icon: Package },
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'На рассмотрении' },
  approved: { bg: '#D1FAE5', text: '#059669', label: 'Одобрена' },
  rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'Отклонена' },
};

export default function AdminShopRequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getAuthToken } = usePlatform();
  const { status: authStatus } = useUserStore();
  const [filter, setFilter] = useState<FilterType>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ShopRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = await getAuthToken();
      if (token) {
        setTokenReady(true);
        return true;
      }
      return false;
    };
    
    checkToken().then(ready => {
      if (ready) return;
      
      const interval = setInterval(async () => {
        if (await checkToken()) {
          clearInterval(interval);
        }
      }, 200);
      
      return () => clearInterval(interval);
    });
  }, [authStatus, getAuthToken]);
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/shop-requests', filter, searchQuery],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('No auth token available');
      
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (searchQuery) params.set('q', searchQuery);
      
      const res = await fetch(`/api/admin/shop-requests?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load requests');
      }
      return res.json();
    },
    enabled: tokenReady,
    staleTime: 30000,
    retry: 2,
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/admin/shop-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to approve request');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shop-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/counts'] });
      toast({ title: 'Заявка одобрена', description: 'Магазин успешно создан' });
      setSelectedRequest(null);
      setShowDetailDialog(false);
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось одобрить заявку', variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/admin/shop-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to reject request');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shop-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/counts'] });
      toast({ title: 'Заявка отклонена' });
      setSelectedRequest(null);
      setShowRejectDialog(false);
      setShowDetailDialog(false);
      setRejectReason('');
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось отклонить заявку', variant: 'destructive' });
    },
  });

  const requests: ShopRequest[] = data?.requests || [];

  const filters: { id: FilterType; label: string }[] = [
    { id: 'pending', label: 'Ожидают' },
    { id: 'approved', label: 'Одобрены' },
    { id: 'rejected', label: 'Отклонены' },
    { id: 'all', label: 'Все' },
  ];

  const handleApprove = (request: ShopRequest) => {
    approveMutation.mutate(request._id);
  };

  const handleReject = (request: ShopRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (!selectedRequest) return;
    rejectMutation.mutate({ requestId: selectedRequest._id, reason: rejectReason });
  };

  const openDetail = (request: ShopRequest) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
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
              Заявки на магазины
            </h1>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 2 }}>
              {requests.length} заявок
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
            onChange={(e) => setSearchQuery(e.target.value)}
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

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
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
        ) : requests.length === 0 ? (
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
              <FileText size={36} color="#fff" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Заявки не найдены
            </div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>
              {filter === 'pending' ? 'Нет новых заявок на рассмотрение' : 'Попробуйте изменить фильтры'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((request) => {
              const typeInfo = shopTypeLabels[request.shopType] || shopTypeLabels.shop;
              const status = statusColors[request.status];
              const TypeIcon = typeInfo.icon;
              
              return (
                <div
                  key={request._id}
                  onClick={() => openDetail(request)}
                  style={{
                    background: '#fff',
                    borderRadius: 20,
                    padding: 16,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                  }}
                  data-testid={`card-request-${request._id}`}
                >
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      background: request.avatar 
                        ? `url(${getThumbnailUrl(request.avatar)}) center/cover`
                        : typeInfo.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {!request.avatar && <TypeIcon size={28} color={typeInfo.color} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6,
                      }}>
                        <div style={{ 
                          fontSize: 17, 
                          fontWeight: 700, 
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {request.name}
                        </div>
                        <div style={{
                          background: status.bg,
                          color: status.text,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '5px 10px',
                          borderRadius: 10,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {status.label}
                        </div>
                      </div>

                      <div style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: typeInfo.bgColor,
                        color: typeInfo.color,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '5px 10px',
                        borderRadius: 8,
                        marginBottom: 10,
                      }}>
                        <TypeIcon size={14} />
                        {typeInfo.label}
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 12, 
                        fontSize: 13, 
                        color: '#6B7280',
                        marginBottom: 12,
                      }}>
                        {request.city && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={14} />
                            {request.city}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={14} />
                          {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>

                      {request.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(request);
                            }}
                            disabled={approveMutation.isPending}
                            style={{
                              flex: 1,
                              height: 42,
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 12,
                              fontSize: 14,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              opacity: approveMutation.isPending ? 0.7 : 1,
                            }}
                            data-testid={`button-approve-${request._id}`}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <>
                                <CheckCircle size={18} />
                                Одобрить
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(request);
                            }}
                            disabled={rejectMutation.isPending}
                            style={{
                              flex: 1,
                              height: 42,
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              borderRadius: 12,
                              fontSize: 14,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              cursor: 'pointer',
                            }}
                            data-testid={`button-reject-${request._id}`}
                          >
                            <XCircle size={18} />
                            Отклонить
                          </button>
                        </div>
                      )}

                      {request.status === 'rejected' && request.rejectReason && (
                        <div style={{
                          padding: 12,
                          background: '#FEE2E2',
                          borderRadius: 12,
                          fontSize: 13,
                          color: '#DC2626',
                        }}>
                          <strong>Причина:</strong> {request.rejectReason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {showDetailDialog && selectedRequest && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowDetailDialog(false)}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: '24px 24px 0 0',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 40,
              height: 4,
              background: '#E5E7EB',
              borderRadius: 2,
              margin: '0 auto 20px',
            }} />

            {(() => {
              const typeInfo = shopTypeLabels[selectedRequest.shopType] || shopTypeLabels.shop;
              const TypeIcon = typeInfo.icon;

              return (
                <>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{
                      width: 72,
                      height: 72,
                      borderRadius: 18,
                      background: selectedRequest.avatar 
                        ? `url(${getThumbnailUrl(selectedRequest.avatar)}) center/cover`
                        : typeInfo.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {!selectedRequest.avatar && <TypeIcon size={36} color={typeInfo.color} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                        {selectedRequest.name}
                      </div>
                      <div style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: typeInfo.bgColor,
                        color: typeInfo.color,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '5px 10px',
                        borderRadius: 8,
                        marginTop: 6,
                      }}>
                        <TypeIcon size={14} />
                        {typeInfo.label}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedRequest.description && (
                    <div style={{
                      background: '#F8FAFC',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>Описание</div>
                      <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.5 }}>
                        {selectedRequest.description}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {(selectedRequest.city || selectedRequest.address) && (
                    <div style={{
                      background: '#F8FAFC',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: '#EEF2FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <MapPin size={20} color="#4F46E5" />
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                            {selectedRequest.city}
                            {selectedRequest.region && `, ${selectedRequest.region}`}
                          </div>
                          {selectedRequest.address && (
                            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                              {selectedRequest.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contacts */}
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
                      Контакты
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedRequest.contacts?.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Phone size={16} color="#fff" />
                          </div>
                          <span style={{ fontSize: 14, color: '#111827' }}>{selectedRequest.contacts.phone}</span>
                        </div>
                      )}
                      {selectedRequest.contacts?.telegram && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #0088cc 0%, #0077b5 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <FaTelegram size={16} color="#fff" />
                          </div>
                          <span style={{ fontSize: 14, color: '#111827' }}>@{selectedRequest.contacts.telegram}</span>
                        </div>
                      )}
                      {selectedRequest.contacts?.instagram && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #E1306C 0%, #C13584 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <FaInstagram size={16} color="#fff" />
                          </div>
                          <span style={{ fontSize: 14, color: '#111827' }}>@{selectedRequest.contacts.instagram}</span>
                        </div>
                      )}
                      {selectedRequest.contacts?.whatsapp && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <FaWhatsapp size={16} color="#fff" />
                          </div>
                          <span style={{ fontSize: 14, color: '#111827' }}>{selectedRequest.contacts.whatsapp}</span>
                        </div>
                      )}
                      {selectedRequest.contacts?.website && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Globe size={16} color="#fff" />
                          </div>
                          <span style={{ fontSize: 14, color: '#111827' }}>{selectedRequest.contacts.website}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User info */}
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                      Заявитель
                    </div>
                    <div style={{ fontSize: 14, color: '#374151' }}>
                      {selectedRequest.userId?.firstName} {selectedRequest.userId?.lastName}
                      {selectedRequest.userId?.username && (
                        <span style={{ color: '#6B7280' }}> (@{selectedRequest.userId.username})</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                      Telegram ID: {selectedRequest.telegramId}
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedRequest.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => handleApprove(selectedRequest)}
                        disabled={approveMutation.isPending}
                        style={{
                          flex: 1,
                          height: 52,
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 14,
                          fontSize: 16,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          opacity: approveMutation.isPending ? 0.7 : 1,
                        }}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <>
                            <CheckCircle size={20} />
                            Одобрить
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleReject(selectedRequest)}
                        disabled={rejectMutation.isPending}
                        style={{
                          flex: 1,
                          height: 52,
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          borderRadius: 14,
                          fontSize: 16,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <XCircle size={20} />
                        Отклонить
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && selectedRequest && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowRejectDialog(false)}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: 24,
              width: '100%',
              maxWidth: 400,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Отклонить заявку
              </h3>
              <button
                onClick={() => setShowRejectDialog(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#F3F4F6',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="#6B7280" />
              </button>
            </div>
            
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
              Укажите причину отклонения заявки "{selectedRequest.name}"
            </p>
            
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Причина отклонения..."
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
              data-testid="input-reject-reason"
            />
            
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setShowRejectDialog(false)}
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
              >
                Отмена
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                style={{
                  flex: 1,
                  height: 48,
                  background: rejectReason.trim() ? '#DC2626' : '#FCA5A5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  'Отклонить'
                )}
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
