import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MapPin, Loader2 } from 'lucide-react';
import FeedCard from '@/components/FeedCard';
import { useGeo } from '@/utils/geo';
import { FeedItem, FeedEvent } from '@/types';
import http from '@/api/http';

const FEED_RADIUS_KM = 20;
const FEED_LIMIT = 20;
const SWIPE_THRESHOLD = 50;

export default function FeedPage() {
  const navigate = useNavigate();
  const { coords, status: geoStatus, requestLocation } = useGeo();
  
  const [items, setItems] = useState<FeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showSwipeHints, setShowSwipeHints] = useState(true);
  
  const currentStartTime = useRef<number | null>(null);
  const pendingEvents = useRef<FeedEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);
  const isTransitioning = useRef<boolean>(false);

  const sendEvents = useCallback(async (events: FeedEvent[]) => {
    if (events.length === 0) return;
    
    try {
      await http.post('/api/feed/events', { events });
    } catch (error) {
      console.error('Failed to send feed events:', error);
    }
  }, []);

  const flushPendingEvents = useCallback(() => {
    if (pendingEvents.current.length > 0) {
      sendEvents([...pendingEvents.current]);
      pendingEvents.current = [];
    }
  }, [sendEvents]);

  const trackEvent = useCallback((event: FeedEvent) => {
    pendingEvents.current.push(event);
    
    if (pendingEvents.current.length >= 5) {
      flushPendingEvents();
    }
  }, [flushPendingEvents]);

  const loadFeed = useCallback(async (cursor?: string) => {
    if (!coords) return;
    
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        lat: coords.lat.toString(),
        lng: coords.lng.toString(),
        radiusKm: FEED_RADIUS_KM.toString(),
        limit: FEED_LIMIT.toString(),
      });
      
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      const response = await http.get(`/api/feed?${params.toString()}`);
      const data = response.data as {
        items: FeedItem[];
        nextCursor: string | null;
        hasMore: boolean;
      };
      
      if (cursor) {
        setItems(prev => [...prev, ...data.items]);
      } else {
        setItems(data.items);
        setCurrentIndex(0);
        
        if (data.items.length > 0) {
          currentStartTime.current = Date.now();
          trackEvent({
            adId: data.items[0]._id,
            eventType: 'impression',
            positionIndex: 0,
            radiusKm: FEED_RADIUS_KM,
            meta: { categoryId: data.items[0].categoryId },
          });
        }
      }
      
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [coords, trackEvent]);

  useEffect(() => {
    if (coords) {
      loadFeed();
    }
  }, [coords, loadFeed]);

  useEffect(() => {
    if (hasMore && nextCursor && currentIndex >= items.length - 3) {
      loadFeed(nextCursor);
    }
  }, [currentIndex, items.length, hasMore, nextCursor, loadFeed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeHints(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      flushPendingEvents();
    };
  }, [flushPendingEvents]);

  const goToNext = useCallback(() => {
    if (currentIndex >= items.length - 1 || isTransitioning.current) return;
    
    isTransitioning.current = true;
    
    if (currentStartTime.current) {
      const dwellTimeMs = Date.now() - currentStartTime.current;
      trackEvent({
        adId: items[currentIndex]._id,
        eventType: 'impression',
        dwellTimeMs,
        positionIndex: currentIndex,
        radiusKm: FEED_RADIUS_KM,
      });
    }
    
    trackEvent({
      adId: items[currentIndex]._id,
      eventType: 'scroll_next',
      positionIndex: currentIndex,
      radiusKm: FEED_RADIUS_KM,
    });
    
    setCurrentIndex(prev => prev + 1);
    currentStartTime.current = Date.now();
    
    const nextItem = items[currentIndex + 1];
    if (nextItem) {
      trackEvent({
        adId: nextItem._id,
        eventType: 'impression',
        positionIndex: currentIndex + 1,
        radiusKm: FEED_RADIUS_KM,
        meta: { categoryId: nextItem.categoryId },
      });
    }
    
    setTimeout(() => {
      isTransitioning.current = false;
    }, 300);
  }, [currentIndex, items, trackEvent]);

  const goToPrev = useCallback(() => {
    if (currentIndex <= 0 || isTransitioning.current) return;
    
    isTransitioning.current = true;
    
    if (currentStartTime.current) {
      const dwellTimeMs = Date.now() - currentStartTime.current;
      trackEvent({
        adId: items[currentIndex]._id,
        eventType: 'impression',
        dwellTimeMs,
        positionIndex: currentIndex,
        radiusKm: FEED_RADIUS_KM,
      });
    }
    
    trackEvent({
      adId: items[currentIndex]._id,
      eventType: 'scroll_prev',
      positionIndex: currentIndex,
      radiusKm: FEED_RADIUS_KM,
    });
    
    setCurrentIndex(prev => prev - 1);
    currentStartTime.current = Date.now();
    
    const prevItem = items[currentIndex - 1];
    if (prevItem) {
      trackEvent({
        adId: prevItem._id,
        eventType: 'impression',
        positionIndex: currentIndex - 1,
        radiusKm: FEED_RADIUS_KM,
        meta: { categoryId: prevItem.categoryId },
      });
    }
    
    setTimeout(() => {
      isTransitioning.current = false;
    }, 300);
  }, [currentIndex, items, trackEvent]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(touchDeltaY.current) > SWIPE_THRESHOLD) {
      if (touchDeltaY.current < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchDeltaY.current = 0;
  }, [goToNext, goToPrev]);

  const handleLike = useCallback(() => {
    const item = items[currentIndex];
    if (item) {
      trackEvent({
        adId: item._id,
        eventType: 'like',
        positionIndex: currentIndex,
        radiusKm: FEED_RADIUS_KM,
        meta: { categoryId: item.categoryId },
      });
      flushPendingEvents();
    }
  }, [currentIndex, items, trackEvent, flushPendingEvents]);

  const handleDislike = useCallback(() => {
    const item = items[currentIndex];
    if (item) {
      trackEvent({
        adId: item._id,
        eventType: 'dislike',
        positionIndex: currentIndex,
        radiusKm: FEED_RADIUS_KM,
        meta: { categoryId: item.categoryId },
      });
    }
    goToNext();
  }, [currentIndex, items, trackEvent, goToNext]);

  const handleViewOpen = useCallback(() => {
    const item = items[currentIndex];
    if (item) {
      trackEvent({
        adId: item._id,
        eventType: 'view_open',
        positionIndex: currentIndex,
        radiusKm: FEED_RADIUS_KM,
        meta: { categoryId: item.categoryId },
      });
      flushPendingEvents();
    }
  }, [currentIndex, items, trackEvent, flushPendingEvents]);

  const needsLocation = !coords && geoStatus !== 'loading';
  const currentItem = items[currentIndex];

  if (needsLocation) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#FFFFFF',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #E5E7EB',
            background: '#FFFFFF',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#1F2937',
              letterSpacing: '-0.5px',
            }}
          >
            KETMAR
          </h1>
          <button
            onClick={() => navigate('/notifications')}
            data-testid="button-notifications"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              background: '#F5F6F8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={20} color="#6B7280" />
          </button>
        </header>

        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#F0F4FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <MapPin size={36} color="#3A7BFF" />
          </div>
          
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 22,
              fontWeight: 700,
              color: '#1F2937',
              textAlign: 'center',
            }}
          >
            Определите местоположение
          </h2>
          
          <p
            style={{
              margin: '0 0 24px',
              fontSize: 15,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Чтобы показать товары рядом с вами
          </p>
          
          <button
            onClick={requestLocation}
            disabled={(geoStatus as string) === 'loading'}
            data-testid="button-request-location"
            style={{
              width: '100%',
              maxWidth: 300,
              padding: '16px 24px',
              background: '#3A7BFF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: (geoStatus as string) === 'loading' ? 'not-allowed' : 'pointer',
              opacity: (geoStatus as string) === 'loading' ? 0.6 : 1,
            }}
          >
            {(geoStatus as string) === 'loading' ? 'Получаем геолокацию...' : 'Определить местоположение'}
          </button>
        </main>
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#000',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
            }}
          >
            KETMAR
          </h1>
          <button
            onClick={() => navigate('/notifications')}
            data-testid="button-notifications"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={20} color="#FFFFFF" />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2
            size={48}
            color="#3A7BFF"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <p
            style={{
              marginTop: 16,
              fontSize: 16,
              color: '#FFFFFF',
              opacity: 0.7,
            }}
          >
            Загружаем ленту...
          </p>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#FFFFFF',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#1F2937',
              letterSpacing: '-0.5px',
            }}
          >
            KETMAR
          </h1>
          <button
            onClick={() => navigate('/notifications')}
            data-testid="button-notifications"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              background: '#F5F6F8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={20} color="#6B7280" />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#F5F6F8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <MapPin size={36} color="#9CA3AF" />
          </div>
          
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 20,
              fontWeight: 600,
              color: '#1F2937',
              textAlign: 'center',
            }}
          >
            Нет товаров поблизости
          </h2>
          
          <p
            style={{
              margin: 0,
              fontSize: 15,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            В радиусе {FEED_RADIUS_KM} км пока нет объявлений
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="feed-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
        touchAction: 'pan-y',
      }}
    >
      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
          zIndex: 20,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.5px',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          KETMAR
        </h1>
        <button
          onClick={() => navigate('/notifications')}
          data-testid="button-notifications"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Bell size={20} color="#FFFFFF" />
        </button>
      </header>

      <main
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {currentItem && (
          <FeedCard
            key={currentItem._id}
            item={currentItem}
            onLike={handleLike}
            onDislike={handleDislike}
            onViewOpen={handleViewOpen}
            showSwipeHints={showSwipeHints}
            isFirst={currentIndex === 0}
            isLast={currentIndex === items.length - 1 && !hasMore}
          />
        )}

        <div
          style={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom) + 90px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16,
          }}
        >
          {items.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((item, idx) => {
            const actualIndex = Math.max(0, currentIndex - 2) + idx;
            const isActive = actualIndex === currentIndex;
            
            return (
              <div
                key={item._id}
                style={{
                  width: isActive ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: isActive ? '#3A7BFF' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s ease',
                }}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
