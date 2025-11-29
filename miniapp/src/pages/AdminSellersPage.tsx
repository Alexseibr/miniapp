import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Store, ArrowLeft, Search, CheckCircle, XCircle, 
  Eye, Shield, Star, Package, Loader2, RefreshCw, MapPin, Users,
  ShieldCheck, ShieldX, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';
import { getThumbnailUrl } from '@/constants/placeholders';

interface SellerProfile {
  _id: string;
  name: string;
  slug: string;
  avatar?: string;
  description?: string;
  isFarmer: boolean;
  phone?: string;
  telegramUsername?: string;
  city?: string;
  region?: string;
  isVerified: boolean;
  isActive: boolean;
  isBlocked: boolean;
  productsCount: number;
  subscribersCount: number;
  ratings: { score: number; count: number };
  createdAt: string;
  telegramId: number;
}

type FilterType = 'all' | 'pending' | 'verified' | 'blocked';

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  verified: { bg: '#D1FAE5', text: '#059669', label: 'Верифицирован', icon: ShieldCheck },
  blocked: { bg: '#FEE2E2', text: '#DC2626', label: 'Заблокирован', icon: ShieldX },
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'На проверке', icon: Shield },
};

export default function AdminSellersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getAuthToken } = usePlatform();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/sellers', filter, searchQuery],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (searchQuery) params.set('q', searchQuery);
      
      const res = await fetch(`/api/admin/sellers?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load sellers');
      return res.json();
    },
    staleTime: 30000,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ sellerId, verified }: { sellerId: string; verified: boolean }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/admin/sellers/${sellerId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verified }),
      });
      if (!res.ok) throw new Error('Failed to update seller');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sellers'] });
      toast({ title: 'Статус обновлён' });
    },
    onError: () => {
      toast({ title: 'Ошибка обновления', variant: 'destructive' });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ sellerId, blocked, reason }: { sellerId: string; blocked: boolean; reason?: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/admin/sellers/${sellerId}/block`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocked, reason }),
      });
      if (!res.ok) throw new Error('Failed to update seller');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sellers'] });
      toast({ title: 'Статус обновлён' });
    },
    onError: () => {
      toast({ title: 'Ошибка обновления', variant: 'destructive' });
    },
  });

  const sellers: SellerProfile[] = data?.sellers || [];

  const filters: { id: FilterType; label: string; count?: number }[] = [
    { id: 'all', label: 'Все' },
    { id: 'pending', label: 'На проверке' },
    { id: 'verified', label: 'Верифицированы' },
    { id: 'blocked', label: 'Заблокированы' },
  ];

  const getSellerStatus = (seller: SellerProfile) => {
    if (seller.isBlocked) return statusConfig.blocked;
    if (seller.isVerified) return statusConfig.verified;
    return statusConfig.pending;
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
              Управление магазинами
            </h1>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 2 }}>
              {sellers.length} магазинов
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

        {/* Filter tabs */}
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
                height: 140,
                animation: 'pulse 2s infinite',
              }} />
            ))}
          </div>
        ) : sellers.length === 0 ? (
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
              <Users size={36} color="#fff" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Продавцы не найдены
            </div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>
              {searchQuery ? 'Попробуйте изменить параметры поиска' : 'Пока нет зарегистрированных продавцов'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sellers.map((seller) => {
              const status = getSellerStatus(seller);
              const StatusIcon = status.icon;
              
              return (
                <div
                  key={seller._id}
                  style={{
                    background: '#fff',
                    borderRadius: 20,
                    padding: 16,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  }}
                  data-testid={`card-seller-${seller._id}`}
                >
                  <div style={{ display: 'flex', gap: 14 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      background: seller.avatar 
                        ? `url(${getThumbnailUrl(seller.avatar)}) center/cover`
                        : 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {!seller.avatar && <Store size={28} color="#fff" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name and status */}
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
                          {seller.name}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: status.bg,
                          color: status.text,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '5px 10px',
                          borderRadius: 10,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          <StatusIcon size={12} />
                          {status.label}
                        </div>
                      </div>

                      {/* Farmer badge */}
                      {seller.isFarmer && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#D1FAE5',
                          color: '#059669',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 8,
                          marginBottom: 8,
                        }}>
                          Фермер
                        </div>
                      )}

                      {/* Stats */}
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 12, 
                        fontSize: 13, 
                        color: '#6B7280',
                        marginBottom: 12,
                      }}>
                        {(seller.city || seller.region) && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={14} />
                            {seller.city || seller.region}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Package size={14} />
                          {seller.productsCount} товаров
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={14} fill="#FBBF24" color="#FBBF24" />
                          {seller.ratings.score.toFixed(1)} ({seller.ratings.count})
                        </span>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => navigate(`/store/${seller.slug}`)}
                          style={{
                            height: 38,
                            padding: '0 14px',
                            background: '#F3F4F6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                          }}
                          data-testid={`button-view-${seller._id}`}
                        >
                          <Eye size={16} />
                          Просмотр
                        </button>
                        
                        {!seller.isVerified && !seller.isBlocked && (
                          <button
                            onClick={() => verifyMutation.mutate({ sellerId: seller._id, verified: true })}
                            disabled={verifyMutation.isPending}
                            style={{
                              height: 38,
                              padding: '0 14px',
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              opacity: verifyMutation.isPending ? 0.7 : 1,
                            }}
                            data-testid={`button-verify-${seller._id}`}
                          >
                            {verifyMutation.isPending ? (
                              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <>
                                <CheckCircle size={16} />
                                Верифицировать
                              </>
                            )}
                          </button>
                        )}

                        {seller.isVerified && (
                          <button
                            onClick={() => verifyMutation.mutate({ sellerId: seller._id, verified: false })}
                            disabled={verifyMutation.isPending}
                            style={{
                              height: 38,
                              padding: '0 14px',
                              background: '#FEF3C7',
                              color: '#92400E',
                              border: 'none',
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                            }}
                            data-testid={`button-unverify-${seller._id}`}
                          >
                            <XCircle size={16} />
                            Снять
                          </button>
                        )}

                        {!seller.isBlocked ? (
                          <button
                            onClick={() => blockMutation.mutate({ sellerId: seller._id, blocked: true })}
                            disabled={blockMutation.isPending}
                            style={{
                              height: 38,
                              padding: '0 14px',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                            }}
                            data-testid={`button-block-${seller._id}`}
                          >
                            <Shield size={16} />
                            Блок
                          </button>
                        ) : (
                          <button
                            onClick={() => blockMutation.mutate({ sellerId: seller._id, blocked: false })}
                            disabled={blockMutation.isPending}
                            style={{
                              height: 38,
                              padding: '0 14px',
                              background: '#D1FAE5',
                              color: '#059669',
                              border: 'none',
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                            }}
                            data-testid={`button-unblock-${seller._id}`}
                          >
                            <Shield size={16} />
                            Разблок
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
