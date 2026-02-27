import { AppShell } from '@/components/layout/AppShell';
import { KPICard } from '@/components/dashboard/KPICard';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { CategoryDonut } from '@/components/dashboard/CategoryDonut';
import { TrendsChart } from '@/components/dashboard/TrendsChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { useDashboardStats, useMonthlySummary, useCategoryTotals } from '@/hooks/useDashboard';
import { Spinner } from '@/components/ui/Spinner';

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: monthly = [], isLoading: monthlyLoading } = useMonthlySummary();
  const { data: categoryTotals = [], isLoading: catLoading } = useCategoryTotals();

  const savingsRate =
    stats && stats.total_income > 0
      ? (stats.net / stats.total_income) * 100
      : 0;

  return (
    <AppShell showTopbar>
      <div className="space-y-6">
        <h1 className="page-header">Dashboard</h1>

        {/* KPI Grid */}
        {statsLoading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Income"
              value={stats?.total_income ?? 0}
              type="currency"
              color="green"
              icon="💰"
            />
            <KPICard
              title="Total Expenses"
              value={stats?.total_expenses ?? 0}
              type="currency"
              color="red"
              icon="💸"
            />
            <KPICard
              title="Net Savings"
              value={stats?.net ?? 0}
              type="currency"
              color="auto"
              icon="📈"
            />
            <KPICard
              title="Savings Rate"
              value={savingsRate}
              type="percent"
              color="neutral"
              icon="🎯"
              subtitle={`${stats?.tx_count ?? 0} transactions`}
            />
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {monthlyLoading ? (
              <div className="card p-5 flex justify-center py-16"><Spinner /></div>
            ) : (
              <IncomeExpenseChart data={monthly} />
            )}
          </div>
          <div>
            {catLoading ? (
              <div className="card p-5 flex justify-center py-16"><Spinner /></div>
            ) : (
              <CategoryDonut data={categoryTotals} />
            )}
          </div>
        </div>

        {/* Trends + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {monthlyLoading ? (
            <div className="card p-5 flex justify-center py-16"><Spinner /></div>
          ) : (
            <TrendsChart data={monthly} />
          )}
          <RecentTransactions />
        </div>
      </div>
    </AppShell>
  );
}
