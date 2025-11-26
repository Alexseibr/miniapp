import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MapPin, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import FeedCard from '@/components/FeedCard';
import { useGeo } from '@/utils/geo';
import { FeedItem, FeedEvent } from '@/types';
import http from '@/api/http';
import { toggleFavorite } from '@/api/favorites';
import { useUserStore } from '@/store/useUserStore';

const FEED_RADIUS_KM = 20;
const FEED_LIMIT = 20;
const AUTO_REFRESH_INTERVAL = 45000; // 45 seconds

export default function FeedPage() {
  const navigate = useNavigate();
  const { coords, status: geoStatus, requestLocation } = useGeo();
  const user = useUserStore((state) => state.user);
  
  const [items, setItems] = useState<FeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [newBuffer, setNewBuffer] = useState<FeedItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  
  const currentStartTime = useRef<number | null>(null);
  const pendingEvents = useRef<FeedEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasShownHint = useRef(false);
  const lastFetchTime = useRef<number>(Date.now());
  const lastScrollIndex = useRef<number>(0);

  // Check if hint was shown before
  useEffect(() => {
    const hintShown = localStorage.getItem('ketmar_feed_hint_shown');
    if (!hintShown) {
      setShowSwipeHint(true);
      hasShownHint.current = false;
    } else {
      hasShownHint.current = true;
    }
  }, []);

  // Auto-hide hint after 3 seconds
  useEffect(() => {
    if (showSwipeHint) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem('ketmar_feed_hint_shown', 'true');
        hasShownHint.current = true;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSwipeHint]);

  const dismissHint = useCallback(() => {
    if (showSwipeHint) {
      setShowSwipeHint(false);
      localStorage.setItem('ketmar_feed_hint_shown', 'true');
      hasShownHint.current = true;
    }
  }, [showSwipeHint]);

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

  const filterWithPhotos = (items: FeedItem[]): FeedItem[] => {
    return items.filter(item => 
      item.previewUrl ||
      (item.images && item.images.length > 0) || 
      (item.photos && item.photos.length > 0)
    );
  };

  const loadFeed = useCallback(async (cursor?: string, isRefresh?: boolean) => {
    if (!coords) return;
    
    try {
      if (!cursor && !isRefresh) {
        setIsLoading(true);
      }
      
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
      
      // Filter out items without photos
      const filteredItems = filterWithPhotos(data.items);
      lastFetchTime.current = Date.now();
      
      if (isRefresh) {
        // For refresh, add new items to buffer
        const existingIds = new Set(items.map(i => i._id));
        const newItems = filteredItems.filter(item => !existingIds.has(item._id));
        if (newItems.length > 0) {
          setNewBuffer(prev => [...prev, ...newItems]);
        }
      } else if (cursor) {
        setItems(prev => [...prev, ...filteredItems]);
      } else {
        setItems(filteredItems);
        setCurrentIndex(0);
        
        if (filteredItems.length > 0) {
          currentStartTime.current = Date.now();
          trackEvent({
            adId: filteredItems[0]._id,
            eventType: 'impression',
            positionIndex: 0,
            radiusKm: FEED_RADIUS_KM,
            meta: { categoryId: filteredItems[0].categoryId },
          });
        }
      }
      
      if (!isRefresh) {
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [coords, items, trackEvent]);

  // Initial load
  useEffect(() => {
    if (coords) {
      loadFeed();
    }
  }, [coords]);

  // Load more when approaching end
  useEffect(() => {
    if (hasMore && nextCursor && currentIndex >= items.length - 3) {
      loadFeed(nextCursor);
    }
  }, [currentIndex, items.length, hasMore, nextCursor]);

  // Periodic refresh for new items
  useEffect(() => {
    if (!coords || items.length === 0) return;
    
    const interval = setInterval(() => {
      loadFeed(undefined, true);
    }, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [coords, items.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      flushPendingEvents();
    };
  }, [flushPendingEvents]);

  // Handle scroll to detect current card and track events
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cardHeight = container.scrollHeight / items.length;
    const scrollTop = container.scrollTop;
    const newIndex = Math.round(scrollTop / cardHeight);
    
    if (newIndex !== lastScrollIndex.current && newIndex >= 0 && newIndex < items.length) {
      const prevIndex = lastScrollIndex.current;
      const prevItem = items[prevIndex];
      const newItem = items[newIndex];
      
      // Track dwell time for previous item
      if (currentStartTime.current && prevItem) {
        const dwellTimeMs = Date.now() - currentStartTime.current;
        trackEvent({
          adId: prevItem._id,
          eventType: 'impression',
          dwellTimeMs,
          positionIndex: prevIndex,
          radiusKm: FEED_RADIUS_KM,
        });
      }
      
      // Track scroll direction
      if (prevItem) {
        trackEvent({
          adId: prevItem._id,
          eventType: newIndex > prevIndex ? 'scroll_next' : 'scroll_prev',
          positionIndex: prevIndex,
          radiusKm: FEED_RADIUS_KM,
        });
      }
      
      // Track impression for new item
      if (newItem) {
        trackEvent({
          adId: newItem._id,
          eventType: 'impression',
          positionIndex: newIndex,
          radiusKm: FEED_RADIUS_KM,
          meta: { categoryId: newItem.categoryId },
        });
      }
      
      lastScrollIndex.current = newIndex;
      currentStartTime.current = Date.now();
      setCurrentIndex(newIndex);
      dismissHint();
    }
  }, [items, trackEvent, dismissHint]);

  const handleLike = useCallback(async (adId: string) => {
    if (!user?.telegramId) return;
    
    const item = items.find(i => i._id === adId);
    if (!item) return;
    
    const isCurrentlyFavorite = favoriteIds.has(adId);
    const newFavoriteState = !isCurrentlyFavorite;
    
    // Optimistic update
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      if (newFavoriteState) {
        newSet.add(adId);
      } else {
        newSet.delete(adId);
      }
      return newSet;
    });
    
    // Track event (only track on adding to favorites)
    if (newFavoriteState) {
      trackEvent({
        adId: item._id,
        eventType: 'like',
        positionIndex: items.indexOf(item),
        radiusKm: FEED_RADIUS_KM,
        meta: { categoryId: item.categoryId },
      });
      flushPendingEvents();
    }
    
    // Call API
    try {
      await toggleFavorite(user.telegramId, adId, newFavoriteState);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Rollback on error
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyFavorite) {
          newSet.add(adId);
        } else {
          newSet.delete(adId);
        }
        return newSet;
      });
    }
  }, [items, favoriteIds, user?.telegramId, trackEvent, flushPendingEvents]);

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
          background: '#FFFFFF',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #F0F2F5',
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
              color: '#6B7280',
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
            В радиусе {FEED_RADIUS_KM} км пока нет объявлений с фото
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="feed-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#F5F6F8',
        overflow: 'hidden',
      }}
    >
      {/* Header - fixed at top */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          zIndex: 50,
          flexShrink: 0,
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

      {/* Main content - Instagram-style scroll */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        }}
      >
        {items.map((item, index) => (
          <div
            key={item._id}
            data-index={index}
            style={{
              height: 'calc(100vh - 65px - env(safe-area-inset-bottom) - 60px)',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              padding: '8px 16px 16px',
              boxSizing: 'border-box',
            }}
          >
            <FeedCard
              item={item}
              onLike={handleLike}
              onViewOpen={handleViewOpen}
              isActive={index === currentIndex}
              nextImageUrl={items[index + 1]?.previewUrl || items[index + 1]?.images?.[0] || items[index + 1]?.photos?.[0]}
              isLiked={favoriteIds.has(item._id)}
            />
          </div>
        ))}
      </main>

      {/* Swipe hint overlay */}
      {showSwipeHint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissHint}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            gap: 20,
          }}
        >
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ChevronUp size={36} color="#fff" />
            <span style={{ fontSize: 15, color: '#fff', fontWeight: 500 }}>
              Свайп вверх
            </span>
          </motion.div>
          
          <div
            style={{
              width: 56,
              height: 90,
              border: '2px solid rgba(255,255,255,0.4)',
              borderRadius: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              animate={{ y: [-18, 18, -18] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              style={{
                width: 6,
                height: 20,
                background: '#fff',
                borderRadius: 3,
              }}
            />
          </div>
          
          <motion.div
            animate={{ y: [8, -8, 8] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 15, color: '#fff', fontWeight: 500 }}>
              Свайп вниз
            </span>
            <ChevronDown size={36} color="#fff" />
          </motion.div>
          
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              marginTop: 12,
            }}
          >
            Нажмите чтобы продолжить
          </p>
        </motion.div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
