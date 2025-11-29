import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { usePlatform } from '@/platform/PlatformProvider';
import StoryViewer from './StoryViewer';

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

const ROLE_GRADIENTS: Record<string, string> = {
  FARMER: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
  SHOP: 'linear-gradient(135deg, #3B73FC 0%, #60A5FA 100%)',
  BLOGGER: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
  ARTISAN: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
};

export default function StoryCarousel() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const { getAuthToken } = usePlatform();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [sellerGroups, setSellerGroups] = useState<SellerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  const fetchStories = useCallback(async () => {
    try {
      let token: string | null = null;
      try {
        token = await getAuthToken();
      } catch (e) {
        console.warn('[Stories] Could not get auth token:', e);
      }
      
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/stories/feed?limit=50', { headers });
      if (!response.ok) {
        console.warn('[Stories] API returned:', response.status);
        setLoading(false);
        return;
      }
      
      const data = await response.json();

      if (data.success && data.stories && Array.isArray(data.stories)) {
        const grouped = groupStoriesBySeller(data.stories);
        setSellerGroups(grouped);
      }
    } catch (err) {
      console.error('[Stories] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const groupStoriesBySeller = (stories: Story[]): SellerGroup[] => {
    const groups = new Map<string, SellerGroup>();

    for (const story of stories) {
      let sellerId: string;
      let sellerInfo: SellerInfo;
      
      if (typeof story.sellerId === 'string') {
        sellerId = story.sellerId;
        sellerInfo = {
          _id: story.sellerId,
          name: story.sellerName || 'Продавец',
          avatar: story.sellerAvatar || undefined,
          slug: story.sellerSlug || '',
          shopRole: story.shopRole || 'SHOP',
        };
      } else if (story.sellerId && typeof story.sellerId === 'object') {
        sellerId = story.sellerId._id;
        sellerInfo = story.sellerId;
      } else {
        console.warn('[Stories] Invalid sellerId in story:', story._id);
        continue;
      }
      
      if (!groups.has(sellerId)) {
        groups.set(sellerId, {
          seller: sellerInfo,
          stories: [],
          hasUnviewed: false,
        });
      }

      const group = groups.get(sellerId)!;
      group.stories.push(story);
      
      if (!story.isViewed) {
        group.hasUnviewed = true;
      }
    }

    const sortedGroups = Array.from(groups.values());
    sortedGroups.sort((a, b) => {
      if (a.hasUnviewed !== b.hasUnviewed) {
        return a.hasUnviewed ? -1 : 1;
      }
      const aLatest = new Date(a.stories[0].publishedAt).getTime();
      const bLatest = new Date(b.stories[0].publishedAt).getTime();
      return bLatest - aLatest;
    });

    return sortedGroups;
  };

  const handleCreateStory = () => {
    navigate('/seller/stories');
  };

  const handleOpenStory = (groupIndex: number) => {
    setSelectedGroupIndex(groupIndex);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    fetchStories();
  };

  const handleNextGroup = () => {
    if (selectedGroupIndex < sellerGroups.length - 1) {
      setSelectedGroupIndex(selectedGroupIndex + 1);
    } else {
      handleCloseViewer();
    }
  };

  const handlePrevGroup = () => {
    if (selectedGroupIndex > 0) {
      setSelectedGroupIndex(selectedGroupIndex - 1);
    }
  };

  const canCreateStory = user?.isSeller || user?.isFarmer;

  if (loading) {
    return (
      <div 
        style={{ 
          padding: '16px 16px 8px',
          display: 'flex',
          gap: 12,
        }}
        data-testid="stories-loading"
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: '#F3F4F6',
              animation: 'pulse 1.5s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    );
  }

  if (sellerGroups.length === 0 && !canCreateStory) {
    return null;
  }

  return (
    <>
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 12,
          padding: '16px 16px 8px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        data-testid="stories-carousel"
      >
        {canCreateStory && (
          <button
            onClick={handleCreateStory}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            data-testid="button-create-story"
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={24} color="#3B73FC" />
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#3B73FC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #FFFFFF',
                }}
              >
                <Plus size={12} color="#FFFFFF" />
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                color: '#6B7280',
                maxWidth: 68,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Добавить
            </span>
          </button>
        )}

        {sellerGroups.map((group, index) => (
          <button
            key={group.seller._id}
            onClick={() => handleOpenStory(index)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            data-testid={`story-bubble-${group.seller._id}`}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                padding: 3,
                background: group.hasUnviewed 
                  ? ROLE_GRADIENTS[group.seller.shopRole] || ROLE_GRADIENTS.SHOP
                  : '#D1D5DB',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {group.seller.avatar ? (
                  <img
                    src={group.seller.avatar}
                    alt={group.seller.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: ROLE_GRADIENTS[group.seller.shopRole] || ROLE_GRADIENTS.SHOP,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    {group.seller.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                color: group.hasUnviewed ? '#1F2937' : '#6B7280',
                fontWeight: group.hasUnviewed ? 500 : 400,
                maxWidth: 68,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {group.seller.name}
            </span>
          </button>
        ))}
      </div>

      {viewerOpen && sellerGroups[selectedGroupIndex] && (
        <StoryViewer
          groups={sellerGroups}
          initialGroupIndex={selectedGroupIndex}
          onClose={handleCloseViewer}
          onNextGroup={handleNextGroup}
          onPrevGroup={handlePrevGroup}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}
