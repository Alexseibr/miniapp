import { ComponentType } from 'react';
import HeroBanner from './blocks/HeroBanner.tsx';
import CategoryGrid from './blocks/CategoryGrid.tsx';
import AdCarousel from './blocks/AdCarousel.tsx';
import AdList from './blocks/AdList.tsx';
import PromoBanner from './blocks/PromoBanner.tsx';
import MapBlock from './blocks/MapBlock.tsx';

interface Block {
  id: string;
  type: string;
  order: number;
  config?: any;
  [key: string]: any;
}

interface RenderBlocksProps {
  blocks: Block[];
  cityCode?: string;
}

const BLOCK_COMPONENTS: Record<string, ComponentType<any>> = {
  hero_banner: HeroBanner,
  category_grid: CategoryGrid,
  ad_carousel: AdCarousel,
  ad_list: AdList,
  promo_banner: PromoBanner,
  map_block: MapBlock,
};

export default function RenderBlocks({ blocks, cityCode }: RenderBlocksProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  const sortedBlocks = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="layout-blocks" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {sortedBlocks.map((block) => {
        const Component = BLOCK_COMPONENTS[block.type];

        if (!Component) {
          console.warn(`Unknown block type: ${block.type}`);
          return null;
        }

        return (
          <Component
            key={block.id}
            {...block}
            config={block.config || {}}
            cityCode={cityCode}
            data-testid={`block-${block.type}-${block.id}`}
          />
        );
      })}
    </div>
  );
}
