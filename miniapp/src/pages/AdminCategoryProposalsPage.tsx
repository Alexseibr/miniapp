import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Check, X, Folder, Loader2, ChevronRight, 
  Package, Hash, Eye, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';

interface CategoryProposal {
  _id: string;
  parentCategorySlug: string;
  parentCategoryName?: string;
  suggestedSlug: string;
  suggestedName: string;
  keywordsSample: string[];
  matchedAdsCount: number;
  confidenceScore: number;
  status: 'pending' | 'approved' | 'rejected';
  sampleAdTitles?: string[];
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface ProposalWithAds extends CategoryProposal {
  sampleAds: Array<{
    _id: string;
    title: string;
    price?: number;
    photos?: string[];
  }>;
}

const confidenceColors = {
  high: { bg: '#DCFCE7', text: '#15803D', label: 'Высокая' },
  medium: { bg: '#FEF3C7', text: '#92400E', label: 'Средняя' },
  low: { bg: '#FEE2E2', text: '#DC2626', label: 'Низкая' },
};

function getConfidenceLevel(score: number) {
  if (score >= 0.7) return confidenceColors.high;
  if (score >= 0.4) return confidenceColors.medium;
  return confidenceColors.low;
}

export default function AdminCategoryProposalsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getAuthToken } = usePlatform();
  
  const [selectedProposal, setSelectedProposal] = useState<ProposalWithAds | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [customName, setCustomName] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data: proposals, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/category-proposals'],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch('/api/admin/category-proposals', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load proposals');
      const result = await res.json();
      return result.proposals as CategoryProposal[];
    },
    staleTime: 60000,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/category-proposals/stats'],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch('/api/admin/category-proposals/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load stats');
      const result = await res.json();
      return result.stats;
    },
    staleTime: 60000,
  });

  const viewProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/admin/category-proposals/${proposalId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load proposal');
      return res.json() as Promise<ProposalWithAds>;
    },
    onSuccess: (data) => {
      setSelectedProposal(data);
      setCustomSlug(data.suggestedSlug);
      setCustomName(data.suggestedName);
      setRejectReason('');
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить предложение', variant: 'destructive' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ proposalId, slug, name }: { proposalId: string; slug: string; name: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/admin/category-proposals/${proposalId}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug, name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Успешно', description: `Категория "${data.newCategory?.name || customName}" создана` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/category-proposals'] });
      setApproveModalOpen(false);
      setSelectedProposal(null);
      setCustomSlug('');
      setCustomName('');
      setRejectReason('');
    },
    onError: (error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ proposalId, reason }: { proposalId: string; reason: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/admin/category-proposals/${proposalId}/reject`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Отклонено', description: 'Предложение отклонено' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/category-proposals'] });
      setRejectModalOpen(false);
      setSelectedProposal(null);
      setCustomSlug('');
      setCustomName('');
      setRejectReason('');
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось отклонить', variant: 'destructive' });
    },
  });

  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch('/api/admin/category-proposals/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to run analysis');
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Анализ завершён', description: `Создано ${data.proposalsCreated} предложений` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/category-proposals'] });
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось запустить анализ', variant: 'destructive' });
    },
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#F8FAFC',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#F5F6F8',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          data-testid="button-back"
        >
          <ArrowLeft size={20} color="#1F2937" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Эволюция категорий
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            Предложения новых категорий
          </p>
        </div>
        <button
          onClick={() => runAnalysisMutation.mutate()}
          disabled={runAnalysisMutation.isPending}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#3B73FC',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: runAnalysisMutation.isPending ? 0.6 : 1,
          }}
          data-testid="button-run-analysis"
        >
          {runAnalysisMutation.isPending ? (
            <Loader2 size={18} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <RefreshCw size={18} color="#fff" />
          )}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 12, 
          padding: 16 
        }}>
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: 12, 
            textAlign: 'center',
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#3B73FC' }}>
              {stats.otherCategoriesTotal || 0}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              Категории "Другое"
            </div>
          </div>
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: 12, 
            textAlign: 'center',
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B' }}>
              {stats.pendingProposals || 0}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              На рассмотрении
            </div>
          </div>
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: 12, 
            textAlign: 'center',
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#22C55E' }}>
              {stats.approvedTotal || 0}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              Создано
            </div>
          </div>
        </div>
      )}

      {/* Proposals List */}
      <div style={{ padding: '0 16px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={32} color="#3B73FC" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : proposals?.length === 0 ? (
          <div style={{ 
            background: '#fff', 
            borderRadius: 16, 
            padding: 40, 
            textAlign: 'center',
            border: '1px solid #E5E7EB',
          }}>
            <Folder size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 16, color: '#6B7280', marginBottom: 8 }}>
              Нет предложений
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>
              Система анализирует категории "Другое" и предлагает новые
            </div>
            <button
              onClick={() => runAnalysisMutation.mutate()}
              disabled={runAnalysisMutation.isPending}
              style={{
                marginTop: 16,
                background: '#3B73FC',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              data-testid="button-run-analysis-empty"
            >
              Запустить анализ
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {proposals?.map((proposal) => {
              const confidence = getConfidenceLevel(proposal.confidenceScore);
              return (
                <div
                  key={proposal._id}
                  onClick={() => viewProposalMutation.mutate(proposal._id)}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 16,
                    border: '1px solid #E5E7EB',
                    cursor: 'pointer',
                  }}
                  data-testid={`proposal-card-${proposal._id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                        {proposal.suggestedName}
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280' }}>
                        <span style={{ color: '#3B73FC' }}>{proposal.parentCategoryName || proposal.parentCategorySlug}</span>
                        {' → '}
                        {proposal.suggestedSlug}
                      </div>
                    </div>
                    <ChevronRight size={20} color="#9CA3AF" />
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div style={{
                      background: confidence.bg,
                      color: confidence.text,
                      padding: '4px 8px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {confidence.label} ({Math.round(proposal.confidenceScore * 100)}%)
                    </div>
                    <div style={{
                      background: '#F3F4F6',
                      color: '#374151',
                      padding: '4px 8px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <Package size={12} />
                      {proposal.matchedAdsCount} объявлений
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {proposal.keywordsSample.slice(0, 5).map((keyword, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                        }}
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedProposal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '20px 20px 0 0',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'auto',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottom: '1px solid #E5E7EB',
              position: 'sticky',
              top: 0,
              background: '#fff',
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {selectedProposal.suggestedName}
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                  {selectedProposal.matchedAdsCount} подходящих объявлений
                </p>
              </div>
              <button
                onClick={() => setSelectedProposal(null)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
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

            <div style={{ padding: 16 }}>
              {/* Info */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Родительская категория</div>
                <div style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>
                  {selectedProposal.parentCategoryName || selectedProposal.parentCategorySlug}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Предлагаемый slug</div>
                <div style={{ fontSize: 15, color: '#111827', fontWeight: 500, fontFamily: 'monospace' }}>
                  {selectedProposal.suggestedSlug}
                </div>
              </div>

              {/* Keywords */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Ключевые слова</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedProposal.keywordsSample.map((keyword, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#EEF2FF',
                        color: '#4F46E5',
                        padding: '4px 10px',
                        borderRadius: 10,
                        fontSize: 13,
                      }}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Ads */}
              {selectedProposal.sampleAds?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Примеры объявлений</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedProposal.sampleAds.slice(0, 5).map((ad) => (
                      <div
                        key={ad._id}
                        style={{
                          background: '#F9FAFB',
                          borderRadius: 10,
                          padding: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
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
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>
                            {ad.title}
                          </div>
                          {ad.price && (
                            <div style={{ fontSize: 13, color: '#3B73FC', fontWeight: 600 }}>
                              {ad.price} руб.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setRejectModalOpen(true)}
                  style={{
                    flex: 1,
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: 'none',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  data-testid="button-reject"
                >
                  <X size={18} />
                  Отклонить
                </button>
                <button
                  onClick={() => setApproveModalOpen(true)}
                  style={{
                    flex: 1,
                    background: '#22C55E',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  data-testid="button-approve"
                >
                  <Check size={18} />
                  Одобрить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModalOpen && selectedProposal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 400,
            padding: 20,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
              Создать категорию
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                Название
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: 15,
                }}
                data-testid="input-category-name"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                Slug (URL-идентификатор)
              </label>
              <input
                type="text"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: 15,
                  fontFamily: 'monospace',
                }}
                data-testid="input-category-slug"
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setApproveModalOpen(false)}
                style={{
                  flex: 1,
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => approveMutation.mutate({
                  proposalId: selectedProposal._id,
                  slug: customSlug,
                  name: customName,
                })}
                disabled={approveMutation.isPending || !customSlug || !customName}
                style={{
                  flex: 1,
                  background: '#22C55E',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: approveMutation.isPending || !customSlug || !customName ? 0.6 : 1,
                }}
                data-testid="button-confirm-approve"
              >
                {approveMutation.isPending ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedProposal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 400,
            padding: 20,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
              Отклонить предложение
            </h3>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                Причина отклонения (опционально)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Например: слишком мало объявлений, похоже на существующую категорию..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: 15,
                  minHeight: 80,
                  resize: 'vertical',
                }}
                data-testid="input-reject-reason"
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setRejectModalOpen(false)}
                style={{
                  flex: 1,
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => rejectMutation.mutate({
                  proposalId: selectedProposal._id,
                  reason: rejectReason,
                })}
                disabled={rejectMutation.isPending}
                style={{
                  flex: 1,
                  background: '#DC2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: rejectMutation.isPending ? 0.6 : 1,
                }}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending ? 'Отклонение...' : 'Отклонить'}
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
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
