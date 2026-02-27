import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/constants';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: Infinity, // categories rarely change
  });
}

export function useCategoryMap(): Record<string, Category> {
  const { data = [] } = useCategories();
  return Object.fromEntries(data.map(c => [c.id, c]));
}

export function useCategoryNameMap(): Record<string, string> {
  const { data = [] } = useCategories();
  return Object.fromEntries(data.map(c => [c.name, c.id]));
}

export function getCategoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? '#94A3B8';
}

export function getCategoryIcon(name: string): string {
  return CATEGORY_ICONS[name] ?? '❓';
}
