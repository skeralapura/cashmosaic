import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DashboardStats, MonthlySummary, CategoryTotal } from '@/lib/types';
import { useAuthContext } from '@/context/AuthContext';
import { useDateRange } from '@/context/DateRangeContext';

export function useDashboardStats() {
  const { user } = useAuthContext();
  const { dateRange } = useDateRange();

  return useQuery({
    queryKey: ['dashboard', user?.id, dateRange.startDate, dateRange.endDate],
    enabled: !!user,
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate,
      });
      if (error) throw error;
      return (data as unknown as DashboardStats) ?? {
        total_income: 0,
        total_expenses: 0,
        net: 0,
        tx_count: 0,
      };
    },
  });
}

export function useMonthlySummary() {
  const { user } = useAuthContext();
  const { dateRange } = useDateRange();

  return useQuery({
    queryKey: ['monthly_summary', user?.id, dateRange.startDate, dateRange.endDate],
    enabled: !!user,
    queryFn: async (): Promise<MonthlySummary[]> => {
      const { data, error } = await supabase
        .from('monthly_summary')
        .select('*')
        .eq('user_id', user!.id)
        .gte('month', dateRange.startDate)
        .lte('month', dateRange.endDate)
        .order('month');
      if (error) throw error;
      return (data ?? []) as MonthlySummary[];
    },
  });
}

export function useCategoryTotals() {
  const { user } = useAuthContext();
  const { dateRange } = useDateRange();

  return useQuery({
    queryKey: ['category_totals', user?.id, dateRange.startDate, dateRange.endDate],
    enabled: !!user,
    queryFn: async (): Promise<CategoryTotal[]> => {
      // category_totals view doesn't filter by date, so query transactions directly
      const { data, error } = await supabase
        .from('transactions')
        .select('category_id, amount, category:categories(id,name,icon,color)')
        .eq('user_id', user!.id)
        .eq('is_excluded', false)
        .lt('amount', 0) // expenses only
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate);
      if (error) throw error;

      // Aggregate by category
      const totalsMap = new Map<string, CategoryTotal>();
      for (const tx of data ?? []) {
        const cat = (tx.category as unknown as { id: string; name: string; icon: string; color: string } | null);
        if (!cat) continue;
        const existing = totalsMap.get(cat.id);
        const absAmount = Math.abs(tx.amount);
        if (existing) {
          existing.total += absAmount;
          existing.transaction_count += 1;
          existing.avg_amount = existing.total / existing.transaction_count;
        } else {
          totalsMap.set(cat.id, {
            user_id: user!.id,
            category_id: cat.id,
            category: cat.name,
            icon: cat.icon,
            color: cat.color,
            transaction_count: 1,
            total: absAmount,
            avg_amount: absAmount,
          });
        }
      }

      return Array.from(totalsMap.values()).sort((a, b) => b.total - a.total);
    },
  });
}

export function useDailyExpenses() {
  const { user } = useAuthContext();
  const { dateRange } = useDateRange();

  return useQuery({
    queryKey: ['daily_expenses', user?.id, dateRange.startDate, dateRange.endDate],
    enabled: !!user,
    queryFn: async (): Promise<{ date: string; total: number; count: number }[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('date, amount')
        .eq('user_id', user!.id)
        .eq('is_excluded', false)
        .lt('amount', 0)
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate);
      if (error) throw error;

      const dayMap = new Map<string, { total: number; count: number }>();
      for (const tx of data ?? []) {
        const abs = Math.abs(tx.amount as number);
        const key = tx.date as string;
        const existing = dayMap.get(key);
        if (existing) {
          existing.total += abs;
          existing.count += 1;
        } else {
          dayMap.set(key, { total: abs, count: 1 });
        }
      }

      return Array.from(dayMap.entries())
        .map(([date, { total, count }]) => ({ date, total, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}
