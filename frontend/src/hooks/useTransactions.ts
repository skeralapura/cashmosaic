import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionFilters } from '@/lib/types';
import { useAuthContext } from '@/context/AuthContext';

export function useTransactions(filters: TransactionFilters = {}) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['transactions', user?.id, filters],
    enabled: !!user,
    queryFn: async (): Promise<Transaction[]> => {
      let query = supabase
        .from('transactions')
        .select('*, account:accounts(id,name,type,institution), category:categories(id,name,icon,color)')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!filters.showExcluded) {
        query = query.eq('is_excluded', false);
      }
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters.accountIds?.length) {
        query = query.in('account_id', filters.accountIds);
      }
      if (filters.categoryIds?.length) {
        query = query.in('category_id', filters.categoryIds);
      }
      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Transaction[];
    },
  });
}

export function useRecentTransactions(limit = 10) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['transactions_recent', user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, account:accounts(id,name,type,institution), category:categories(id,name,icon,color)')
        .eq('user_id', user!.id)
        .eq('is_excluded', false)
        .order('date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Transaction[];
    },
  });
}

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      categoryId,
    }: {
      transactionId: string;
      categoryId: string | null;
    }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions_recent'] });
      queryClient.invalidateQueries({ queryKey: ['category_totals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useBulkUpdateCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Array<{ transactionId: string; categoryId: string }>
    ) => {
      const results = await Promise.all(
        updates.map(({ transactionId, categoryId }) =>
          supabase
            .from('transactions')
            .update({ category_id: categoryId })
            .eq('id', transactionId)
        )
      );
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['category_totals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUncategorizedTransactions() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['transactions_uncategorized', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, account:accounts(id,name,type,institution), category:categories(id,name,icon,color)')
        .eq('user_id', user!.id)
        .eq('is_excluded', false)
        .is('category_id', null)
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Transaction[];
    },
  });
}
