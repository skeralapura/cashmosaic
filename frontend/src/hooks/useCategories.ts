import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/constants';
import { useAuthContext } from '@/context/AuthContext';

export function useCategories() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['categories', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Category[]> => {
      // RLS returns global (user_id IS NULL) + own sub-categories automatically
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    staleTime: 5 * 60 * 1000, // 5 min — user categories can change
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

// ── User Sub-Category Mutations ─────────────────────────────────────────────

export interface CreateUserCategoryInput {
  name: string;
  icon: string;
  color: string;
  parentId: string;
  isExpense: boolean;
}

export function useCreateUserCategory() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserCategoryInput) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: input.name.trim(),
          icon: input.icon,
          color: input.color,
          parent_id: input.parentId,
          user_id: user!.id,
          is_expense: input.isExpense,
          sort_order: 999,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteUserCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
