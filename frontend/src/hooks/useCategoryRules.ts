import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CategoryRule } from '@/lib/types';
import { useAuthContext } from '@/context/AuthContext';
import { buildSortedRules } from '@/lib/categorizer';
import { USER_RULE_PRIORITY } from '@/lib/constants';

export function useCategoryRules() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['category_rules', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch global rules (user_id IS NULL)
      const { data: globalRules, error: e1 } = await supabase
        .from('category_rules')
        .select('*, category:categories(*)')
        .is('user_id', null)
        .order('priority', { ascending: false });
      if (e1) throw e1;

      // Fetch user-specific rules
      const { data: userRules, error: e2 } = await supabase
        .from('category_rules')
        .select('*, category:categories(*)')
        .eq('user_id', user!.id)
        .order('priority', { ascending: false });
      if (e2) throw e2;

      return {
        globalRules: (globalRules ?? []) as CategoryRule[],
        userRules: (userRules ?? []) as CategoryRule[],
        sortedRules: buildSortedRules(
          (globalRules ?? []) as CategoryRule[],
          (userRules ?? []) as CategoryRule[]
        ),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      categoryId,
      keyword,
      priority = USER_RULE_PRIORITY,
    }: {
      categoryId: string;
      keyword: string;
      priority?: number;
    }) => {
      const { data, error } = await supabase
        .from('category_rules')
        .insert({
          user_id: user!.id,
          category_id: categoryId,
          keyword: keyword.trim(),
          priority,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_rules'] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('category_rules')
        .delete()
        .eq('id', ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_rules'] });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      keyword,
      priority,
      categoryId,
    }: {
      id: string;
      keyword?: string;
      priority?: number;
      categoryId?: string;
    }) => {
      const { data, error } = await supabase
        .from('category_rules')
        .update({
          ...(keyword !== undefined && { keyword: keyword.trim() }),
          ...(priority !== undefined && { priority }),
          ...(categoryId !== undefined && { category_id: categoryId }),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_rules'] });
    },
  });
}
