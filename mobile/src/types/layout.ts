export type LayoutBlockType =
  | 'hero_banner'
  | 'category_grid'
  | 'ad_list'
  | 'banner'
  | 'map';

export interface LayoutBlock {
  id: string;
  type: LayoutBlockType;
  slotId?: string;
  title?: string;
  subtitle?: string;
  categoryIds?: string[];
  source?: string;
  limit?: number;
  layout?: 'horizontal' | 'vertical' | 'grid' | string;
}

export interface LayoutResponse {
  cityCode: string;
  screen: string;
  variant?: string;
  blocks: LayoutBlock[];
}
