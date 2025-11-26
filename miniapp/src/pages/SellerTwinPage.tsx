import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, TrendingUp, AlertTriangle, BarChart3, Lightbulb,
  Target, ArrowRight, CheckCircle2, Clock, ArrowLeft,
  Leaf, Star, Eye, RefreshCw, X, Settings, Bell, ThumbsUp, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUserStore } from '@/store/useUserStore';
import PageLoader from '@/components/PageLoader';
import AuthScreen from '@/components/AuthScreen';

interface Issue {
  _id: string;
  type: string;
  severity: number;
  message: string;
  actionRequired?: string;
  adId?: string;
  adTitle?: string;
  isResolved?: boolean;
}

interface Recommendation {
  _id: string;
  type: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  adId?: string;
  adTitle?: string;
  metadata?: Record<string, unknown>;
  isRead?: boolean;
  isActedUpon?: boolean;
}

interface Prediction {
  adId: string;
  adTitle: string;
  expectedViews3d: number;
  expectedViews7d: number;
  chanceOfSale: number;
  optimalPrice?: number;
  optimalPublishTime?: string;
  factors?: { name: string; impact: number; description: string }[];
}

interface Opportunity {
  type: string;
  categoryName?: string;
  message: string;
  demandScore?: number;
}

interface SeasonalInsight {
  categoryId: string;
  categoryName: string;
  currentDemandLevel: string;
  notes: string;
  recommendedAction: string;
}

interface TwinOverview {
  stats: {
    totalAds: number;
    activeAds: number;
    avgQualityScore: number;
    totalViews: number;
    totalContacts: number;
  };
  qualityReport: {
    score: number;
    breakdown: {
      photosScore: number;
      descriptionsScore: number;
    };
  };
  issues: Issue[];
  recommendations: Recommendation[];
  predictions: Prediction[];
  seasonalInsights: SeasonalInsight[];
  missedOpportunities: Opportunity[];
  isFarmer: boolean;
}

interface TwinSettings {
  notificationsEnabled: boolean;
  notifyOnDemandSpike: boolean;
  notifyOnCompetitor: boolean;
  notifyOnIssue: boolean;
  notifyOnOpportunity: boolean;
}

async function fetchTwinOverview(telegramId: number): Promise<TwinOverview> {
  const res = await fetch(`/api/seller-twin/overview`, {
    headers: { 'x-telegram-id': String(telegramId) },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function fetchTwinSettings(telegramId: number): Promise<TwinSettings> {
  const res = await fetch(`/api/seller-twin/settings`, {
    headers: { 'x-telegram-id': String(telegramId) },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export default function SellerTwinPage() {
  const user = useUserStore((state) => state.user);
  const status = useUserStore((state) => state.status);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);

  const telegramId = user?.telegramId;

  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ['seller-twin-overview', telegramId],
    queryFn: () => fetchTwinOverview(telegramId!),
    enabled: !!telegramId,
    staleTime: 30000,
  });

  const { data: settings } = useQuery({
    queryKey: ['seller-twin-settings', telegramId],
    queryFn: () => fetchTwinSettings(telegramId!),
    enabled: !!telegramId && showSettings,
  });

  const markReadMutation = useMutation({
    mutationFn: async (recId: string) => {
      const res = await fetch(`/api/seller-twin/recommendations/${recId}/read`, {
        method: 'POST',
        headers: { 'x-telegram-id': String(telegramId) },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-twin-overview'] });
    },
  });

  const resolveIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await fetch(`/api/seller-twin/issues/${issueId}/resolve`, {
        method: 'POST',
        headers: { 'x-telegram-id': String(telegramId) },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-twin-overview'] });
      toast({ title: 'Проблема отмечена как решённая' });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<TwinSettings>) => {
      const res = await fetch(`/api/seller-twin/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-id': String(telegramId),
        },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-twin-settings'] });
      toast({ title: 'Настройки сохранены' });
    },
  });

  if (status === 'loading') {
    return <PageLoader />;
  }

  if (status === 'need_phone') {
    return <AuthScreen />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center gap-3 p-4 border-b">
          <button onClick={() => navigate(-1)} data-testid="button-back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Digital Twin</h1>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Brain className="w-16 h-16 mx-auto text-primary animate-pulse" />
            <p className="text-muted-foreground">Анализируем ваш магазин...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center gap-3 p-4 border-b">
          <button onClick={() => navigate(-1)} data-testid="button-back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Digital Twin</h1>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Нет данных для анализа</p>
            <p className="text-sm text-muted-foreground">Добавьте объявления, чтобы начать</p>
          </div>
        </div>
      </div>
    );
  }

  const unresolvedIssues = overview.issues.filter((i: Issue) => !i.isResolved);
  const unreadRecs = overview.recommendations.filter((r: Recommendation) => !r.isRead);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} data-testid="button-back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Digital Twin</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-twin-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => refetch()}
            data-testid="button-twin-refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {showSettings && settings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4 pt-2"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Уведомления Twin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Все уведомления</span>
                  <Switch
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(v: boolean) => updateSettingsMutation.mutate({ notificationsEnabled: v })}
                    data-testid="switch-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Всплески спроса</span>
                  <Switch
                    checked={settings.notifyOnDemandSpike}
                    onCheckedChange={(v: boolean) => updateSettingsMutation.mutate({ notifyOnDemandSpike: v })}
                    data-testid="switch-demand-spike"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Конкуренты</span>
                  <Switch
                    checked={settings.notifyOnCompetitor}
                    onCheckedChange={(v: boolean) => updateSettingsMutation.mutate({ notifyOnCompetitor: v })}
                    data-testid="switch-competitor"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 py-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-4 text-white mb-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Ваш AI-ассистент</h2>
              <p className="text-sm text-white/80">Анализирует магазин 24/7</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{overview.stats.activeAds}</div>
              <div className="text-xs text-white/70">Объявлений</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{overview.stats.avgQualityScore}%</div>
              <div className="text-xs text-white/70">Качество</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{unresolvedIssues.length}</div>
              <div className="text-xs text-white/70">Проблем</div>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 mb-4">
            <TabsTrigger value="overview" className="text-xs px-1" data-testid="tab-overview">
              <BarChart3 className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs px-1 relative" data-testid="tab-recommendations">
              <Lightbulb className="w-4 h-4" />
              {unreadRecs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadRecs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="issues" className="text-xs px-1 relative" data-testid="tab-issues">
              <AlertTriangle className="w-4 h-4" />
              {unresolvedIssues.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unresolvedIssues.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs px-1" data-testid="tab-predictions">
              <TrendingUp className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="seasonal" className="text-xs px-1" data-testid="tab-seasonal">
              <Leaf className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Качество объявлений
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        className="text-muted"
                        strokeWidth="8"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        className={cn(
                          overview.qualityReport.score >= 70 ? 'text-green-500' :
                          overview.qualityReport.score >= 40 ? 'text-yellow-500' : 'text-red-500'
                        )}
                        strokeWidth="8"
                        strokeDasharray={`${overview.qualityReport.score * 2.26} 226`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold">{overview.qualityReport.score}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Фото</span>
                        <span>{overview.qualityReport.breakdown.photosScore}%</span>
                      </div>
                      <Progress value={overview.qualityReport.breakdown.photosScore} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Описания</span>
                        <span>{overview.qualityReport.breakdown.descriptionsScore}%</span>
                      </div>
                      <Progress value={overview.qualityReport.breakdown.descriptionsScore} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {overview.missedOpportunities.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-500" />
                    Упущенные возможности
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overview.missedOpportunities.slice(0, 3).map((opp: Opportunity, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg"
                    >
                      <Sparkles className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{opp.message}</p>
                        {opp.demandScore && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Спрос: {Math.round(opp.demandScore * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-3 mt-0">
            {overview.recommendations.length === 0 ? (
              <div className="text-center py-8">
                <ThumbsUp className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="font-medium">Всё отлично!</p>
                <p className="text-sm text-muted-foreground">Нет новых рекомендаций</p>
              </div>
            ) : (
              overview.recommendations.map((rec: Recommendation) => (
                <motion.div
                  key={rec._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  layout
                >
                  <Card className={cn(
                    'transition-all',
                    rec.isRead && 'opacity-60'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                          rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-blue-100 text-blue-600'
                        )}>
                          <Lightbulb className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant={
                              rec.priority === 'high' ? 'destructive' :
                              rec.priority === 'medium' ? 'secondary' : 'outline'
                            } className="text-xs">
                              {rec.priority === 'high' ? 'Важно' :
                               rec.priority === 'medium' ? 'Средний' : 'Совет'}
                            </Badge>
                            {!rec.isRead && (
                              <Badge variant="default" className="text-xs bg-primary">
                                Новое
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">{rec.text}</p>
                          {rec.adTitle && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {rec.adTitle}
                            </p>
                          )}
                        </div>
                        {!rec.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0"
                            onClick={() => markReadMutation.mutate(rec._id)}
                            data-testid={`button-read-rec-${rec._id}`}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="issues" className="space-y-3 mt-0">
            {unresolvedIssues.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="font-medium">Проблем не обнаружено</p>
                <p className="text-sm text-muted-foreground">Ваш магазин в отличном состоянии</p>
              </div>
            ) : (
              unresolvedIssues.map((issue: Issue) => (
                <motion.div
                  key={issue._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  layout
                >
                  <Card className={cn(
                    'border-l-4',
                    issue.severity > 0.7 ? 'border-l-red-500' :
                    issue.severity > 0.4 ? 'border-l-yellow-500' : 'border-l-blue-500'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={cn(
                          'w-5 h-5 flex-shrink-0 mt-0.5',
                          issue.severity > 0.7 ? 'text-red-500' :
                          issue.severity > 0.4 ? 'text-yellow-500' : 'text-blue-500'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{issue.message}</p>
                          {issue.adTitle && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {issue.adTitle}
                            </p>
                          )}
                          {issue.actionRequired && (
                            <p className="text-xs text-primary mt-2 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              {issue.actionRequired}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => resolveIssueMutation.mutate(issue._id)}
                          data-testid={`button-resolve-issue-${issue._id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="predictions" className="space-y-3 mt-0">
            {overview.predictions.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Нет данных для прогнозов</p>
                <p className="text-sm text-muted-foreground">Добавьте объявления для анализа</p>
              </div>
            ) : (
              overview.predictions.map((pred: Prediction) => (
                <Card key={pred.adId}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <h4 className="font-medium text-sm truncate flex-1">{pred.adTitle}</h4>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {Math.round(pred.chanceOfSale * 100)}% шанс
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Eye className="w-3 h-3" />
                          <span className="text-xs">3 дня</span>
                        </div>
                        <div className="font-bold">{pred.expectedViews3d}</div>
                      </div>
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Eye className="w-3 h-3" />
                          <span className="text-xs">7 дней</span>
                        </div>
                        <div className="font-bold">{pred.expectedViews7d}</div>
                      </div>
                    </div>

                    {pred.optimalPrice && (
                      <div className="flex items-center justify-between text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded-lg mb-2">
                        <span className="text-muted-foreground">Рекомендуемая цена</span>
                        <span className="font-bold text-green-600">{pred.optimalPrice} BYN</span>
                      </div>
                    )}

                    {pred.optimalPublishTime && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Лучшее время: {pred.optimalPublishTime}</span>
                      </div>
                    )}

                    {pred.factors && pred.factors.length > 0 && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {pred.factors.map((factor: { name: string; impact: number; description: string }, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className={cn(
                              'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold',
                              factor.impact > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            )}>
                              {factor.impact > 0 ? '+' : '-'}
                            </span>
                            <span className="text-muted-foreground">{factor.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="seasonal" className="space-y-3 mt-0">
            {!overview.isFarmer ? (
              <div className="text-center py-8">
                <Leaf className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Фермерский блок</p>
                <p className="text-sm text-muted-foreground">
                  Добавьте товары из категории "Фермерские продукты"
                </p>
              </div>
            ) : (
              overview.seasonalInsights.map((insight: SeasonalInsight) => (
                <Card key={insight.categoryId}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-green-500" />
                        <span className="font-medium">{insight.categoryName}</span>
                      </div>
                      <Badge variant={
                        insight.currentDemandLevel === 'peak' ? 'default' :
                        insight.currentDemandLevel === 'high' ? 'secondary' : 'outline'
                      } className={cn(
                        insight.currentDemandLevel === 'peak' && 'bg-green-500'
                      )}>
                        {insight.currentDemandLevel === 'peak' ? 'ПИК' :
                         insight.currentDemandLevel === 'high' ? 'Высокий' :
                         insight.currentDemandLevel === 'medium' ? 'Средний' : 'Низкий'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{insight.notes}</p>
                    
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <ArrowRight className="w-4 h-4" />
                      <span>{insight.recommendedAction}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
