import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Account } from '@/lib/types';
import { useAuthContext } from '@/context/AuthContext';

export function useAccounts() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['accounts', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      name,
      type,
      institution,
    }: {
      name: string;
      type: 'bank' | 'credit_card';
      institution: string;
    }): Promise<Account> => {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user!.id,
          name,
          type,
          institution,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
