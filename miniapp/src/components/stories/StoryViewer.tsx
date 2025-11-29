import { useState, useEffect, useRef, useCallback, TouchEvent } from 'react';
import { X, ChevronLeft, ChevronRight, ShoppingBag, Eye, Pause, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { usePlatform } from '@/platform/PlatformProvider';

interface StoryItem {
  type: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  duration: number;
}

interface SellerInfo {
  _id: string;
  name: string;
  avatar?: string | null;
  slug: string;
  shopRole: 'SHOP' | 'FARMER' | 'BLOGGER' | 'ARTISAN';
}

interface Story {
  _id: string;
  sellerId: string | SellerInfo;
  sellerName?: string;
  sellerAvatar?: string | null;
  sellerSlug?: string;
  shopRole?: 'SHOP' | 'FARMER' | 'BLOGGER' | 'ARTISAN';
  items: StoryItem[];
  linkedAdId?: string | {
    _id: string;
    title: string;
    price: number;
    currency: string;
    photos?: string[];
    previewUrl?: string;
  };
  caption?: string;
  isViewed?: boolean;
  publishedAt: string;
  viewsCount?: number;
  viewCount?: number;
}

interface SellerGroup {
  seller: SellerInfo;
  stories: Story[];
  hasUnviewed: boolean;
}

interface StoryViewerProps {
  groups: SellerGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onNextGroup: () => void;
  onPrevGroup: () => void;
}

const ROLE_GRADIENTS: Record<string, string> = {
  FARMER: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
  SHOP: 'linear-gradient(135deg, #3B73FC 0%, #60A5FA 100%)',
  BLOGGER: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
  ARTISAN: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
};

export default function StoryViewer({
  groups,
  initialGroupIndex,
  onClose,
  onNextGroup,
  onPrevGroup,
}: StoryViewerProps) {
  const navigate = useNavigate();
  const { getAuthToken } = usePlatform();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentGroup = groups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const currentItem = currentStory?.items[currentItemIndex];

  const totalItems = currentGroup?.stories.reduce((sum, s) => sum + s.items.length, 0) || 0;
  const currentGlobalIndex = (() => {
    let index = 0;
    for (let i = 0; i < currentStoryIndex; i++) {
      index += currentGroup?.stories[i]?.items.length || 0;
    }
    return index + currentItemIndex;
  })();

  const recordView = useCallback(async (storyId: string, completed: boolean = false, clickedProduct: boolean = false) => {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch(`/api/stories/${storyId}/view`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ completed, clickedProduct }),
      });
    } catch (error) {
      console.error('[StoryViewer] Record view error:', error);
    }
  }, [getAuthToken]);

  const goToNextItem = useCallback(() => {
    if (!currentGroup || !currentStory) return;

    if (currentItemIndex < currentStory.items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setProgress(0);
    } else if (currentStoryIndex < currentGroup.stories.length - 1) {
      recordView(currentStory._id, true);
      setCurrentStoryIndex(currentStoryIndex + 1);
      setCurrentItemIndex(0);
      setProgress(0);
    } else {
      recordView(currentStory._id, true);
      if (currentGroupIndex < groups.length - 1) {
        setCurrentGroupIndex(currentGroupIndex + 1);
        setCurrentStoryIndex(0);
        setCurrentItemIndex(0);
        setProgress(0);
        onNextGroup();
      } else {
        onClose();
      }
    }
  }, [currentGroup, currentStory, currentItemIndex, currentStoryIndex, currentGroupIndex, groups.length, recordView, onNextGroup, onClose]);

  const goToPrevItem = useCallback(() => {
    if (!currentGroup || !currentStory) return;

    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setProgress(0);
    } else if (currentStoryIndex > 0) {
      const prevStory = currentGroup.stories[currentStoryIndex - 1];
      setCurrentStoryIndex(currentStoryIndex - 1);
      setCurrentItemIndex(prevStory.items.length - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      const prevGroup = groups[currentGroupIndex - 1];
      const lastStory = prevGroup.stories[prevGroup.stories.length - 1];
      setCurrentGroupIndex(currentGroupIndex - 1);
      setCurrentStoryIndex(prevGroup.stories.length - 1);
      setCurrentItemIndex(lastStory.items.length - 1);
      setProgress(0);
      onPrevGroup();
    }
  }, [currentGroup, currentStory, currentItemIndex, currentStoryIndex, currentGroupIndex, groups, onPrevGroup]);

  useEffect(() => {
    if (!currentItem || isPaused) return;

    const duration = currentItem.duration || 5000;
    const updateInterval = 50;
    let elapsed = 0;

    if (currentItem.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    progressInterval.current = setInterval(() => {
      elapsed += updateInterval;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (elapsed >= duration) {
        goToNextItem();
      }
    }, updateInterval);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentItem, currentItemIndex, currentStoryIndex, currentGroupIndex, isPaused, goToNextItem]);

  useEffect(() => {
    if (currentStory) {
      recordView(currentStory._id, false);
    }
  }, [currentStory?._id, recordView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNextItem();
      if (e.key === 'ArrowLeft') goToPrevItem();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(!isPaused);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextItem, goToPrevItem, onClose, isPaused]);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsPaused(true);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    setIsPaused(false);
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNextItem();
      } else {
        goToPrevItem();
      }
    }

    setTouchStart(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      goToPrevItem();
    } else if (x > (width * 2) / 3) {
      goToNextItem();
    } else {
      setIsPaused(!isPaused);
    }
  };

  const handleProductClick = () => {
    if (currentStory?.linkedAdId) {
      recordView(currentStory._id, false, true);
      onClose();
      navigate(`/ads/${currentStory.linkedAdId._id}`);
    }
  };

  const handleSellerClick = () => {
    if (currentGroup?.seller) {
      onClose();
      navigate(`/seller/${currentGroup.seller.slug || currentGroup.seller._id}`);
    }
  };

  if (!currentGroup || !currentStory || !currentItem) {
    return null;
  }

  const content = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#000000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      data-testid="story-viewer"
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 12px 0',
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
        }}
      >
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {Array.from({ length: totalItems }).map((_, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: 3,
                background: 'rgba(255,255,255,0.3)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: '#FFFFFF',
                  borderRadius: 2,
                  width: idx < currentGlobalIndex 
                    ? '100%' 
                    : idx === currentGlobalIndex 
                      ? `${progress}%` 
                      : '0%',
                  transition: idx === currentGlobalIndex ? 'none' : 'width 0.3s ease',
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSellerClick();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
            data-testid="button-seller-profile"
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                padding: 2,
                background: ROLE_GRADIENTS[currentGroup.seller.shopRole] || ROLE_GRADIENTS.SHOP,
              }}
            >
              {currentGroup.seller.avatar ? (
                <img
                  src={currentGroup.seller.avatar}
                  alt={currentGroup.seller.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1F2937',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {currentGroup.seller.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600 }}>
                {currentGroup.seller.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {getTimeAgo(currentStory.publishedAt)}
              </div>
            </div>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused(!isPaused);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              data-testid="button-pause-play"
            >
              {isPaused ? (
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Pause size={18} color="#FFFFFF" fill="#FFFFFF" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              data-testid="button-close-story"
            >
              <X size={20} color="#FFFFFF" />
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {currentItem.type === 'video' ? (
          <video
            ref={videoRef}
            src={currentItem.mediaUrl}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            playsInline
            muted
            loop={false}
            poster={currentItem.thumbnailUrl}
          />
        ) : (
          <img
            src={currentItem.mediaUrl}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        )}
      </div>

      {currentStory.caption && (
        <div
          style={{
            position: 'absolute',
            bottom: currentStory.linkedAdId ? 140 : 80,
            left: 16,
            right: 16,
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 12,
            color: '#FFFFFF',
            fontSize: 14,
            lineHeight: 1.4,
            backdropFilter: 'blur(8px)',
          }}
          data-testid="story-caption"
        >
          {currentStory.caption}
        </div>
      )}

      {currentStory.linkedAdId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleProductClick();
          }}
          style={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            left: 16,
            right: 16,
            padding: 12,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 16,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
          data-testid="button-view-product"
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              overflow: 'hidden',
              flexShrink: 0,
              background: '#F3F4F6',
            }}
          >
            {(currentStory.linkedAdId.previewUrl || currentStory.linkedAdId.photos?.[0]) && (
              <img
                src={currentStory.linkedAdId.previewUrl || currentStory.linkedAdId.photos?.[0]}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
          </div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#1F2937',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentStory.linkedAdId.title}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#059669',
                marginTop: 2,
              }}
            >
              {currentStory.linkedAdId.price} {currentStory.linkedAdId.currency || 'BYN'}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#3B73FC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShoppingBag size={20} color="#FFFFFF" />
          </div>
        </button>
      )}

      {currentStory.viewsCount !== undefined && currentStory.viewsCount > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: currentStory.linkedAdId ? 100 : 'calc(env(safe-area-inset-bottom) + 16px)',
            left: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'rgba(255,255,255,0.8)',
            fontSize: 13,
          }}
          data-testid="story-views-count"
        >
          <Eye size={16} />
          {currentStory.viewsCount}
        </div>
      )}

      {groups.length > 1 && (
        <>
          {currentGroupIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const prevGroup = groups[currentGroupIndex - 1];
                setCurrentGroupIndex(currentGroupIndex - 1);
                setCurrentStoryIndex(0);
                setCurrentItemIndex(0);
                setProgress(0);
              }}
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              data-testid="button-prev-group"
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </button>
          )}

          {currentGroupIndex < groups.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentGroupIndex(currentGroupIndex + 1);
                setCurrentStoryIndex(0);
                setCurrentItemIndex(0);
                setProgress(0);
              }}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              data-testid="button-next-group"
            >
              <ChevronRight size={24} color="#FFFFFF" />
            </button>
          )}
        </>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  return `${Math.floor(diffHours / 24)} дн назад`;
}
