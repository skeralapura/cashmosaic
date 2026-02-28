import { useQuery } from '@tanstack/react-query';

export interface CashFlowGroup {
  name: string;
  icon: string;
  color: string;
  total: number;
}

export interface CashFlowData {
  incomes: CashFlowGroup[];
  expenses: CashFlowGroup[];
  totalIncome: number;
  totalExpenses: number;
  savings: number;
}
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

export function useCashFlowData() {
  const { user } = useAuthContext();
  const { dateRange } = useDateRange();

  return useQuery({
    queryKey: ['cashflow', user?.id, dateRange.startDate, dateRange.endDate],
    enabled: !!user,
    queryFn: async (): Promise<CashFlowData> => {
      // Fetch all categories so we can resolve parent info for sub-categories
      const { data: allCats, error: catErr } = await supabase
        .from('categories')
        .select('id, name, icon, color, parent_id');
      if (catErr) throw catErr;

      type CatRow = { id: string; name: string; icon: string; color: string; parent_id: string | null };
      const catById = new Map<string, CatRow>(
        (allCats ?? []).map((c: CatRow) => [c.id, c])
      );

      // Roll a sub-category up to its parent for the Sankey macro view
      const effectiveCat = (cat: CatRow): CatRow => {
        if (cat.parent_id) {
          const parent = catById.get(cat.parent_id);
          if (parent) return parent;
        }
        return cat;
      };

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category:categories(id, name, icon, color, parent_id)')
        .eq('user_id', user!.id)
        .eq('is_excluded', false)
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate);
      if (error) throw error;

      const incomeMap = new Map<string, CashFlowGroup>();
      const expenseMap = new Map<string, CashFlowGroup>();

      for (const tx of data ?? []) {
        const cat = tx.category as CatRow | null;
        if (!cat || cat.name === 'Uncategorized') continue;
        const eff = effectiveCat(cat);
        if (eff.name === 'Uncategorized') continue;
        const abs = Math.abs(tx.amount as number);
        const map = (tx.amount as number) > 0 ? incomeMap : expenseMap;
        const existing = map.get(eff.id);
        if (existing) {
          existing.total += abs;
        } else {
          map.set(eff.id, { name: eff.name, icon: eff.icon, color: eff.color, total: abs });
        }
      }

      const incomes = Array.from(incomeMap.values()).sort((a, b) => b.total - a.total);
      const expenses = Array.from(expenseMap.values()).sort((a, b) => b.total - a.total);
      const totalIncome = incomes.reduce((s, i) => s + i.total, 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);
      return { incomes, expenses, totalIncome, totalExpenses, savings: totalIncome - totalExpenses };
    },
  });
}
