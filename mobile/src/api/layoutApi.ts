import { httpClient } from './httpClient';

export interface LayoutBlock {
  type: string;
  source?: string;
  title?: string;
}

export interface LayoutResponse {
  cityCode: string;
  screen: string;
  blocks: LayoutBlock[];
}

export const layoutApi = {
  getLayout: (cityCode: string | undefined, screen: string) =>
    httpClient.get<LayoutResponse>('/layout', { params: { cityCode, screen } })
};
