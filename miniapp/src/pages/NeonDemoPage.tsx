import { motion } from 'framer-motion';
import { Eye, ShoppingCart, Heart, TrendingUp, Users, Zap, Activity, Star } from 'lucide-react';
import {
  neonTheme,
  NeonCard,
  NeonStatCard,
  NeonBadge,
  NeonStatusBadge,
  NeonTag,
  NeonHistogram,
  NeonLineChart,
  NeonGrid,
  NeonHeatmap,
  NeonDensityGrid,
} from '@/components/ui/neon';
import '@/components/ui/neon/neon.css';

const mockHistogramData = [
  { label: 'Mon', value: 120 },
  { label: 'Tue', value: 180 },
  { label: 'Wed', value: 150 },
  { label: 'Thu', value: 220 },
  { label: 'Fri', value: 310 },
  { label: 'Sat', value: 280 },
  { label: 'Sun', value: 190 },
];

const mockLineData = [
  { label: 'Jan', value: 1200 },
  { label: 'Feb', value: 1800 },
  { label: 'Mar', value: 1500 },
  { label: 'Apr', value: 2200 },
  { label: 'May', value: 2800 },
  { label: 'Jun', value: 3100 },
  { label: 'Jul', value: 2900 },
  { label: 'Aug', value: 3500 },
];

const mockGridItems = [
  { id: '1', title: 'Premium Headphones', price: 12500, currency: 'RUB', isNew: true, subtitle: 'Moscow, 2.5 km', imageUrl: 'https://picsum.photos/200/200?random=1' },
  { id: '2', title: 'Gaming Keyboard', price: 8900, currency: 'RUB', isHot: true, subtitle: 'SPb, 1.2 km', imageUrl: 'https://picsum.photos/200/200?random=2' },
  { id: '3', title: 'Wireless Mouse', price: 3500, currency: 'RUB', priceDropPercent: 15, subtitle: 'Moscow, 3.1 km', imageUrl: 'https://picsum.photos/200/200?random=3' },
  { id: '4', title: 'USB-C Hub', price: 4200, currency: 'RUB', subtitle: 'Moscow, 0.8 km', imageUrl: 'https://picsum.photos/200/200?random=4' },
];

const mockHeatmapPoints = [
  { lat: 55.7558, lng: 37.6173, weight: 100, label: 'Moscow Center' },
  { lat: 55.7500, lng: 37.6500, weight: 80, label: 'Taganskaya' },
  { lat: 55.7800, lng: 37.5900, weight: 60, label: 'Belorusskaya' },
  { lat: 55.7350, lng: 37.6600, weight: 90, label: 'Kurskaya' },
  { lat: 55.7650, lng: 37.5500, weight: 45, label: 'Krasnopresnenskaya' },
  { lat: 55.7450, lng: 37.5800, weight: 70, label: 'Park Kultury' },
];

const mockDensityData = Array.from({ length: 35 }, (_, i) => ({
  row: Math.floor(i / 7),
  col: i % 7,
  value: Math.floor(Math.random() * 100),
}));

export default function NeonDemoPage() {
  return (
    <div 
      className="min-h-screen p-4 neon-container"
      style={{ background: neonTheme.colors.background }}
      data-testid="page-neon-demo"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <header className="text-center mb-8">
          <motion.h1
            className="text-3xl font-bold mb-2 neon-text-glow"
            style={{ color: neonTheme.colors.neonCyan }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            data-testid="text-page-title"
          >
            NEON UI KIT
          </motion.h1>
          <p 
            className="text-sm"
            style={{ color: neonTheme.colors.textSecondary }}
          >
            Matrix / Cyberpunk Analytics Components
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <NeonBadge color="cyan" variant="glow">Analytics</NeonBadge>
            <NeonBadge color="fuchsia" variant="filled">Campaign</NeonBadge>
            <NeonBadge color="lime" variant="outlined">Real-time</NeonBadge>
            <NeonStatusBadge status="online" />
          </div>
        </header>

        <section className="mb-8">
          <h2 
            className="text-lg font-semibold mb-4"
            style={{ color: neonTheme.colors.textPrimary }}
            data-testid="text-section-stats"
          >
            Statistics Cards
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            <NeonStatCard
              title="Total Views"
              value="12,458"
              subtitle="+12.5% vs last week"
              icon={<Eye size={20} />}
              trend={{ value: 12.5, isPositive: true }}
              glowColor="cyan"
            />
            <NeonStatCard
              title="Conversions"
              value="348"
              subtitle="CTR: 2.8%"
              icon={<ShoppingCart size={20} />}
              trend={{ value: 8.2, isPositive: true }}
              glowColor="lime"
            />
            <NeonStatCard
              title="Favorites"
              value="1,245"
              subtitle="Active watchers"
              icon={<Heart size={20} />}
              trend={{ value: 3.1, isPositive: false }}
              glowColor="fuchsia"
            />
            <NeonStatCard
              title="Revenue"
              value="₽847K"
              subtitle="This month"
              icon={<TrendingUp size={20} />}
              trend={{ value: 24.8, isPositive: true }}
              glowColor="orange"
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 
            className="text-lg font-semibold mb-4"
            style={{ color: neonTheme.colors.textPrimary }}
            data-testid="text-section-histogram"
          >
            Activity Histogram
          </h2>
          
          <NeonCard glowColor="cyan" variant="glass">
            <div className="flex items-center justify-between mb-4">
              <span 
                className="text-sm font-medium"
                style={{ color: neonTheme.colors.textSecondary }}
              >
                Weekly Ad Views
              </span>
              <NeonBadge color="cyan" variant="outlined" size="sm">
                <Activity size={12} className="mr-1" />
                Live
              </NeonBadge>
            </div>
            <NeonHistogram
              data={mockHistogramData}
              height={180}
              primaryColor="cyan"
              showGrid
              showTooltip
            />
          </NeonCard>
        </section>

        <section className="mb-8">
          <h2 
            className="text-lg font-semibold mb-4"
            style={{ color: neonTheme.colors.textPrimary }}
            data-testid="text-section-linechart"
          >
            Revenue Trend
          </h2>
          
          <NeonCard glowColor="fuchsia" variant="glass">
            <div className="flex items-center justify-between mb-4">
              <span 
                className="text-sm font-medium"
                style={{ color: neonTheme.colors.textSecondary }}
              >
                Monthly Revenue
              </span>
              <div className="flex gap-2">
                <NeonTag label="2024" color="fuchsia" />
                <NeonTag label="Q3" color="cyan" />
              </div>
            </div>
            <NeonLineChart
              data={mockLineData}
              height={200}
              lineColor="fuchsia"
              pointColor="lime"
              showArea
              showPoints
              curveType="smooth"
            />
          </NeonCard>
        </section>

        <section className="mb-8">
          <h2 
            className="text-lg font-semibold mb-4"
            style={{ color: neonTheme.colors.textPrimary }}
            data-testid="text-section-heatmap"
          >
            Geo Analytics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NeonCard glowColor="lime" variant="glass">
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-sm font-medium"
                  style={{ color: neonTheme.colors.textSecondary }}
                >
                  Activity Heatmap
                </span>
                <NeonBadge color="lime" size="sm">
                  <Users size={12} className="mr-1" />
                  6 zones
                </NeonBadge>
              </div>
              <NeonHeatmap
                points={mockHeatmapPoints}
                width={280}
                height={200}
                showLegend
              />
            </NeonCard>
            
            <NeonCard glowColor="orange" variant="glass">
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-sm font-medium"
                  style={{ color: neonTheme.colors.textSecondary }}
                >
                  Weekly Density
                </span>
                <NeonBadge color="orange" size="sm">
                  <Zap size={12} className="mr-1" />
                  Peak: Fri
                </NeonBadge>
              </div>
              <div className="flex justify-center">
                <NeonDensityGrid
                  data={mockDensityData}
                  rows={5}
                  cols={7}
                  cellSize={36}
                />
              </div>
              <div 
                className="flex justify-between text-xs mt-2 px-1"
                style={{ color: neonTheme.colors.textMuted }}
              >
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </NeonCard>
          </div>
        </section>

        <section className="mb-8">
          <h2 
            className="text-lg font-semibold mb-4"
            style={{ color: neonTheme.colors.textPrimary }}
            data-testid="text-section-products"
          >
            Product Grid
          </h2>
          
          <NeonGrid
            items={mockGridItems}
            columns={2}
            gap={12}
            onItemClick={(item) => console.log('Clicked:', item)}
          />
        </section>

        <section className="mb-8">
          <h2 
            className="text-lg font-semibold mb-4"
            style={{ color: neonTheme.colors.textPrimary }}
            data-testid="text-section-badges"
          >
            Badges & Tags
          </h2>
          
          <NeonCard variant="glass">
            <div className="space-y-4">
              <div>
                <p 
                  className="text-xs mb-2"
                  style={{ color: neonTheme.colors.textMuted }}
                >
                  Variants
                </p>
                <div className="flex flex-wrap gap-2">
                  <NeonBadge color="cyan" variant="filled">Filled</NeonBadge>
                  <NeonBadge color="fuchsia" variant="outlined">Outlined</NeonBadge>
                  <NeonBadge color="lime" variant="glow">Glow</NeonBadge>
                </div>
              </div>
              
              <div>
                <p 
                  className="text-xs mb-2"
                  style={{ color: neonTheme.colors.textMuted }}
                >
                  Sizes
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <NeonBadge size="sm">Small</NeonBadge>
                  <NeonBadge size="md">Medium</NeonBadge>
                  <NeonBadge size="lg">Large</NeonBadge>
                </div>
              </div>
              
              <div>
                <p 
                  className="text-xs mb-2"
                  style={{ color: neonTheme.colors.textMuted }}
                >
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  <NeonStatusBadge status="online" />
                  <NeonStatusBadge status="busy" />
                  <NeonStatusBadge status="away" />
                  <NeonStatusBadge status="offline" />
                </div>
              </div>
              
              <div>
                <p 
                  className="text-xs mb-2"
                  style={{ color: neonTheme.colors.textMuted }}
                >
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  <NeonTag label="Electronics" color="cyan" />
                  <NeonTag label="Sale" color="fuchsia" onRemove={() => {}} />
                  <NeonTag label="Featured" color="lime" />
                  <NeonTag label="Limited" color="orange" />
                </div>
              </div>
              
              <div>
                <p 
                  className="text-xs mb-2"
                  style={{ color: neonTheme.colors.textMuted }}
                >
                  Animated
                </p>
                <div className="flex flex-wrap gap-2">
                  <NeonBadge color="cyan" pulse>
                    <Star size={12} className="mr-1" />
                    Featured
                  </NeonBadge>
                  <NeonBadge color="fuchsia" variant="glow" pulse>
                    <Zap size={12} className="mr-1" />
                    Trending
                  </NeonBadge>
                </div>
              </div>
            </div>
          </NeonCard>
        </section>

        <footer 
          className="text-center py-4"
          style={{ color: neonTheme.colors.textMuted, fontSize: 11 }}
        >
          <p>KETMAR Market Campaign Analytics</p>
          <p className="mt-1">Matrix/Neon UI Kit v1.0</p>
        </footer>
      </motion.div>
    </div>
  );
}
