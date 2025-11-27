import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const isDev = import.meta.env.DEV;
  
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    timestamp: Date.now(),
    url: window.location.href,
  };
  
  console.log('📊 Web Vitals:', body);
}

export function initWebVitals() {
  try {
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    
    console.log('✅ Web Vitals monitoring initialized');
  } catch (error) {
    console.warn('⚠️ Web Vitals initialization failed:', error);
  }
}
