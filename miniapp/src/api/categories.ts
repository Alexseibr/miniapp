import http from './http';
import { CategoryNode } from '@/types';

export async function fetchCategories(): Promise<CategoryNode[]> {
  const response = await http.get('/api/categories');
  return response.data?.items || response.data || [];
}
