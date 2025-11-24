import React from 'react';
import type { LayoutBlock } from '../../types/layout';
import type { Ad } from '../../types/ad';
import { HeroBannerBlock } from '../blocks/HeroBannerBlock';
import { CategoryGridBlock } from '../blocks/CategoryGridBlock';
import { AdListBlock } from '../blocks/AdListBlock';
import { PromoBannerBlock } from '../blocks/PromoBannerBlock';
import { MapBlock } from '../blocks/MapBlock';

interface LayoutRendererProps {
  blocks: LayoutBlock[];
  adsBySource: Record<string, Ad[]>;
  onAdClick: (ad: Ad) => void;
  onCategoryClick: (categoryId: string) => void;
}

export const LayoutRenderer: React.FC<LayoutRendererProps> = ({
  blocks,
  adsBySource,
  onAdClick,
  onCategoryClick,
}) => {
  return (
    <div className="flex flex-col gap-3 pb-16">
      {blocks.map((block) => {
        switch (block.type) {
          case 'hero_banner':
            return (
              <HeroBannerBlock
                key={block.id}
                title={block.title}
                subtitle={block.subtitle}
                slotId={block.slotId}
              />
            );
          case 'category_grid':
            return (
              <CategoryGridBlock
                key={block.id}
                title={block.title}
                categoryIds={block.categoryIds || []}
                onCategoryClick={onCategoryClick}
              />
            );
          case 'ad_list': {
            const ads = block.source ? adsBySource[block.source] || [] : [];
            return (
              <AdListBlock
                key={block.id}
                title={block.title}
                ads={ads}
                layout={block.layout}
                onAdClick={onAdClick}
              />
            );
          }
          case 'banner':
            return (
              <PromoBannerBlock
                key={block.id}
                title={block.title}
                subtitle={block.subtitle}
                slotId={block.slotId}
              />
            );
          case 'map':
            return <MapBlock key={block.id} title={block.title} source={block.source} />;
          default:
            return null;
        }
      })}
    </div>
  );
};
