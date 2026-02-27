import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TransactionFiltersBar } from '@/components/transactions/TransactionFilters';
import { CategoryBadge } from '@/components/transactions/CategoryBadge';
import { ExportButton } from '@/components/transactions/ExportButton';
import { Spinner } from '@/components/ui/Spinner';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategoryMap } from '@/hooks/useCategories';
import { formatDate, formatAmount } from '@/lib/formatters';
import { clsx } from 'clsx';
import type { TransactionFilters } from '@/lib/types';

export function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const categoryMap = useCategoryMap();

  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const catParam = searchParams.get('category');
    return catParam ? { categoryIds: [catParam] } : {};
  });

  const { data: transactions = [], isLoading } = useTransactions(filters);

  const total = transactions.length;
  const incomeSum = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenseSum = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="page-header mb-0">Transactions</h1>
          <ExportButton transactions={transactions} />
        </div>

        {/* Filters */}
        <div className="card p-4">
          <TransactionFiltersBar filters={filters} onChange={setFilters} />
        </div>

        {/* Summary bar */}
        {total > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-slate-400">{total} transactions</span>
            <span className="text-slate-600">·</span>
            <span className="text-green-400">Income: {formatAmount(incomeSum)}</span>
            <span className="text-slate-600">·</span>
            <span className="text-red-400">Expenses: {formatAmount(expenseSum)}</span>
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-slate-400">No transactions found.</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or upload a CSV file.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-700 bg-slate-800/50">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr
                      key={tx.id}
                      className={clsx(
                        'border-b border-slate-700/30 table-row-hover',
                        tx.is_excluded && 'opacity-40'
                      )}
                    >
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                          {tx.account?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-200 max-w-sm truncate block" title={tx.description}>
                          {tx.description}
                        </span>
                        {tx.is_excluded && (
                          <span className="text-xs text-slate-600 mt-0.5 block">
                            Excluded: {tx.exclude_reason}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tx.is_excluded ? (
                          <span className="text-xs text-slate-600">—</span>
                        ) : (
                          <CategoryBadge
                            categoryId={tx.category_id}
                            transactionId={tx.id}
                            description={tx.description}
                            categoryMap={categoryMap}
                          />
                        )}
                      </td>
                      <td className={clsx(
                        'px-4 py-3 text-right font-medium whitespace-nowrap',
                        tx.amount >= 0 ? 'text-green-400' : 'text-slate-200'
                      )}>
                        {formatAmount(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
