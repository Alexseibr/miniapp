import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Eye, 
  MousePointer, 
  ShoppingCart, 
  TrendingUp, 
  MapPin,
  Calendar,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';
import {
  neonTheme,
  NeonCard,
  NeonStatCard,
  NeonBadge,
  NeonHistogram,
  NeonLineChart,
  NeonHeatmap,
  type HistogramDataPoint,
  type LineChartDataPoint,
  type HeatmapPoint,
} from '@/components/ui/neon';
import '@/components/ui/neon/neon.css';

interface CampaignOverview {
  impressions: number;
  clicks: number;
  favorites: number;
  orders: number;
  revenue: number;
  ctr: number;
  conversionRate: number;
  avgOrderValue: number;
}

interface DailyStats {
  date: string;
  impressions: number;
  clicks: number;
  orders: number;
  revenue: number;
}

interface GeoStats {
  city: string;
  lat: number;
  lng: number;
  impressions: number;
  clicks: number;
  orders: number;
}

interface PriceStats {
  category: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  priceRange: string;
}

export default function CampaignAnalyticsPage() {
  const { campaignCode } = useParams<{ campaignCode: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'geo' | 'prices'>('overview');

  const { data: overviewData, isLoading: loadingOverview } = useQuery<{ 
    success: boolean; 
    data: CampaignOverview 
  }>({
    queryKey: ['/api/campaign-analytics/overview', { campaignCode }],
    enabled: !!campaignCode,
  });

  const { data: dailyData, isLoading: loadingDaily } = useQuery<{ 
    success: boolean; 
    data: DailyStats[] 
  }>({
    queryKey: ['/api/campaign-analytics/daily', { campaignCode }],
    enabled: !!campaignCode && activeTab === 'daily',
  });

  const { data: geoData, isLoading: loadingGeo } = useQuery<{ 
    success: boolean; 
    data: GeoStats[] 
  }>({
    queryKey: ['/api/campaign-analytics/geo', { campaignCode }],
    enabled: !!campaignCode && activeTab === 'geo',
  });

  const { data: pricesData, isLoading: loadingPrices } = useQuery<{ 
    success: boolean; 
    data: PriceStats[] 
  }>({
    queryKey: ['/api/campaign-analytics/prices', { campaignCode }],
    enabled: !!campaignCode && activeTab === 'prices',
  });

  const overview = overviewData?.data;
  const daily = dailyData?.data || [];
  const geo = geoData?.data || [];
  const prices = pricesData?.data || [];

  const histogramData: HistogramDataPoint[] = daily.map(d => ({
    label: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    value: d.impressions,
  }));

  const lineChartData: LineChartDataPoint[] = daily.map(d => ({
    label: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    value: d.revenue,
  }));

  const heatmapPoints: HeatmapPoint[] = geo.map(g => ({
    lat: g.lat,
    lng: g.lng,
    weight: g.impressions,
    label: g.city,
  }));

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (num: number): string => {
    if (num >= 1000000) return `₽${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `₽${(num / 1000).toFixed(0)}K`;
    return `₽${num.toLocaleString()}`;
  };

  return (
    <div 
      className="min-h-screen neon-container"
      style={{ background: neonTheme.colors.background }}
      data-testid="page-campaign-analytics"
    >
      <header 
        className="sticky top-0 z-50 flex items-center gap-3 p-4 border-b"
        style={{ 
          background: neonTheme.colors.backgroundCard,
          borderColor: neonTheme.colors.border,
          backdropFilter: neonTheme.blur.heavy,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover-elevate"
          style={{ color: neonTheme.colors.textPrimary }}
          data-testid="button-back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 
            className="text-lg font-bold neon-text-glow"
            style={{ color: neonTheme.colors.neonCyan }}
            data-testid="text-page-title"
          >
            CAMPAIGN ANALYTICS
          </h1>
          <p 
            className="text-xs"
            style={{ color: neonTheme.colors.textMuted }}
          >
            {campaignCode?.toUpperCase()}
          </p>
        </div>
        <NeonBadge color="lime" variant="glow" pulse>
          <Activity size={12} className="mr-1" />
          Live
        </NeonBadge>
      </header>

      <nav className="flex border-b overflow-x-auto" style={{ borderColor: neonTheme.colors.border }}>
        {(['overview', 'daily', 'geo', 'prices'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: activeTab === tab ? neonTheme.colors.neonCyan : neonTheme.colors.textMuted,
              borderBottom: activeTab === tab ? `2px solid ${neonTheme.colors.neonCyan}` : '2px solid transparent',
              background: activeTab === tab ? `${neonTheme.colors.neonCyan}10` : 'transparent',
            }}
            data-testid={`tab-${tab}`}
          >
            {tab === 'overview' && <><BarChart3 size={14} className="inline mr-1" /> Overview</>}
            {tab === 'daily' && <><Calendar size={14} className="inline mr-1" /> Daily</>}
            {tab === 'geo' && <><MapPin size={14} className="inline mr-1" /> Geo</>}
            {tab === 'prices' && <><TrendingUp size={14} className="inline mr-1" /> Prices</>}
          </button>
        ))}
      </nav>

      <main className="p-4">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {loadingOverview ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <NeonCard key={i} variant="glass" className="h-24 animate-pulse">
                    <div className="h-full" />
                  </NeonCard>
                ))}
              </div>
            ) : overview ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <NeonStatCard
                    title="Impressions"
                    value={formatNumber(overview.impressions)}
                    icon={<Eye size={18} />}
                    glowColor="cyan"
                  />
                  <NeonStatCard
                    title="Clicks"
                    value={formatNumber(overview.clicks)}
                    subtitle={`CTR: ${overview.ctr.toFixed(2)}%`}
                    icon={<MousePointer size={18} />}
                    glowColor="fuchsia"
                  />
                  <NeonStatCard
                    title="Orders"
                    value={formatNumber(overview.orders)}
                    subtitle={`Conv: ${overview.conversionRate.toFixed(2)}%`}
                    icon={<ShoppingCart size={18} />}
                    glowColor="lime"
                  />
                  <NeonStatCard
                    title="Revenue"
                    value={formatCurrency(overview.revenue)}
                    subtitle={`AOV: ${formatCurrency(overview.avgOrderValue)}`}
                    icon={<TrendingUp size={18} />}
                    glowColor="orange"
                  />
                </div>

                <NeonCard variant="glass" glowColor="cyan">
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ color: neonTheme.colors.textSecondary }}>
                      Conversion Funnel
                    </span>
                    <NeonBadge color="cyan" size="sm" variant="outlined">
                      <Zap size={10} className="mr-1" />
                      Real-time
                    </NeonBadge>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { label: 'Impressions', value: overview.impressions, pct: 100, color: 'cyan' as const },
                      { label: 'Clicks', value: overview.clicks, pct: (overview.clicks / overview.impressions) * 100, color: 'fuchsia' as const },
                      { label: 'Favorites', value: overview.favorites, pct: (overview.favorites / overview.impressions) * 100, color: 'lime' as const },
                      { label: 'Orders', value: overview.orders, pct: (overview.orders / overview.impressions) * 100, color: 'orange' as const },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: neonTheme.colors.textMuted }}>{item.label}</span>
                          <span style={{ color: neonTheme.colors.textPrimary }}>
                            {formatNumber(item.value)} ({item.pct.toFixed(1)}%)
                          </span>
                        </div>
                        <motion.div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ background: neonTheme.colors.backgroundSecondary }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{ 
                              background: neonTheme.colors[`neon${item.color.charAt(0).toUpperCase() + item.color.slice(1)}` as keyof typeof neonTheme.colors],
                              boxShadow: `0 0 10px ${neonTheme.colors[`neon${item.color.charAt(0).toUpperCase() + item.color.slice(1)}` as keyof typeof neonTheme.colors]}`,
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(item.pct, 100)}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                          />
                        </motion.div>
                      </div>
                    ))}
                  </div>
                </NeonCard>
              </>
            ) : (
              <NeonCard variant="outlined" className="text-center py-8">
                <p style={{ color: neonTheme.colors.textMuted }}>No data available</p>
              </NeonCard>
            )}
          </motion.div>
        )}

        {activeTab === 'daily' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {loadingDaily ? (
              <NeonCard variant="glass" className="h-64 animate-pulse">
                <div className="h-full" />
              </NeonCard>
            ) : daily.length > 0 ? (
              <>
                <NeonCard variant="glass" glowColor="cyan">
                  <div className="flex items-center justify-between mb-4">
                    <span style={{ color: neonTheme.colors.textSecondary }}>
                      Daily Impressions
                    </span>
                    <NeonBadge color="cyan" size="sm">Last 7 days</NeonBadge>
                  </div>
                  <NeonHistogram
                    data={histogramData}
                    height={180}
                    primaryColor="cyan"
                    showGrid
                    showTooltip
                  />
                </NeonCard>

                <NeonCard variant="glass" glowColor="lime">
                  <div className="flex items-center justify-between mb-4">
                    <span style={{ color: neonTheme.colors.textSecondary }}>
                      Revenue Trend
                    </span>
                    <NeonBadge color="lime" size="sm">₽</NeonBadge>
                  </div>
                  <NeonLineChart
                    data={lineChartData}
                    height={180}
                    lineColor="lime"
                    pointColor="fuchsia"
                    showArea
                    curveType="smooth"
                  />
                </NeonCard>
              </>
            ) : (
              <NeonCard variant="outlined" className="text-center py-8">
                <p style={{ color: neonTheme.colors.textMuted }}>No daily data available</p>
              </NeonCard>
            )}
          </motion.div>
        )}

        {activeTab === 'geo' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {loadingGeo ? (
              <NeonCard variant="glass" className="h-64 animate-pulse">
                <div className="h-full" />
              </NeonCard>
            ) : geo.length > 0 ? (
              <>
                <NeonCard variant="glass" glowColor="lime">
                  <div className="flex items-center justify-between mb-4">
                    <span style={{ color: neonTheme.colors.textSecondary }}>
                      Activity Heatmap
                    </span>
                    <NeonBadge color="lime" size="sm">
                      {geo.length} regions
                    </NeonBadge>
                  </div>
                  <div className="flex justify-center">
                    <NeonHeatmap
                      points={heatmapPoints}
                      width={300}
                      height={220}
                      showLegend
                    />
                  </div>
                </NeonCard>

                <NeonCard variant="glass" glowColor="fuchsia">
                  <div className="mb-3" style={{ color: neonTheme.colors.textSecondary }}>
                    Top Regions
                  </div>
                  <div className="space-y-2">
                    {geo.slice(0, 5).map((region, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg"
                        style={{ background: neonTheme.colors.backgroundSecondary }}
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ 
                              background: neonTheme.colors.neonFuchsia,
                              color: neonTheme.colors.background,
                            }}
                          >
                            {i + 1}
                          </span>
                          <span style={{ color: neonTheme.colors.textPrimary }}>
                            {region.city}
                          </span>
                        </div>
                        <div className="text-right">
                          <div 
                            className="text-sm font-bold"
                            style={{ color: neonTheme.colors.neonCyan }}
                          >
                            {formatNumber(region.impressions)}
                          </div>
                          <div 
                            className="text-xs"
                            style={{ color: neonTheme.colors.textMuted }}
                          >
                            impressions
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </NeonCard>
              </>
            ) : (
              <NeonCard variant="outlined" className="text-center py-8">
                <p style={{ color: neonTheme.colors.textMuted }}>No geo data available</p>
              </NeonCard>
            )}
          </motion.div>
        )}

        {activeTab === 'prices' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {loadingPrices ? (
              <NeonCard variant="glass" className="h-64 animate-pulse">
                <div className="h-full" />
              </NeonCard>
            ) : prices.length > 0 ? (
              <NeonCard variant="glass" glowColor="orange">
                <div className="mb-4" style={{ color: neonTheme.colors.textSecondary }}>
                  Price Ranges by Category
                </div>
                <div className="space-y-4">
                  {prices.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-1">
                        <span 
                          className="text-sm font-medium"
                          style={{ color: neonTheme.colors.textPrimary }}
                        >
                          {item.category}
                        </span>
                        <span 
                          className="text-sm"
                          style={{ color: neonTheme.colors.neonOrange }}
                        >
                          {item.priceRange}
                        </span>
                      </div>
                      <div 
                        className="h-2 rounded-full relative overflow-hidden"
                        style={{ background: neonTheme.colors.backgroundSecondary }}
                      >
                        <motion.div
                          className="absolute h-full rounded-full"
                          style={{ 
                            background: `linear-gradient(90deg, ${neonTheme.colors.neonOrange}, ${neonTheme.colors.neonLime})`,
                            left: '10%',
                            right: '10%',
                          }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                        />
                        <motion.div
                          className="absolute w-3 h-3 rounded-full -top-0.5"
                          style={{ 
                            background: neonTheme.colors.neonCyan,
                            boxShadow: `0 0 10px ${neonTheme.colors.neonCyan}`,
                            left: `${30 + Math.random() * 40}%`,
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
                        />
                      </div>
                      <div 
                        className="flex justify-between text-xs mt-1"
                        style={{ color: neonTheme.colors.textMuted }}
                      >
                        <span>{formatCurrency(item.minPrice)}</span>
                        <span>avg: {formatCurrency(item.avgPrice)}</span>
                        <span>{formatCurrency(item.maxPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </NeonCard>
            ) : (
              <NeonCard variant="outlined" className="text-center py-8">
                <p style={{ color: neonTheme.colors.textMuted }}>No price data available</p>
              </NeonCard>
            )}
          </motion.div>
        )}
      </main>

      <footer 
        className="p-4 text-center"
        style={{ color: neonTheme.colors.textMuted, fontSize: 11 }}
      >
        <p>KETMAR Campaign Analytics</p>
        <p className="mt-1">Powered by Neon UI Kit</p>
      </footer>
    </div>
  );
}
