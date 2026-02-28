import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TransactionFiltersBar } from '@/components/transactions/TransactionFilters';
import { CategoryBadge } from '@/components/transactions/CategoryBadge';
import { ExportButton } from '@/components/transactions/ExportButton';
import { UncategorizedReview } from '@/components/categorization/UncategorizedReview';
import { Spinner } from '@/components/ui/Spinner';
import { useTransactions, useUncategorizedTransactions, useExcludeTransaction } from '@/hooks/useTransactions';
import { useCategoryMap } from '@/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatAmount } from '@/lib/formatters';
import { clsx } from 'clsx';
import type { TransactionFilters, Transaction } from '@/lib/types';

type SortCol = 'date' | 'description' | 'amount' | 'category';
type SortDir = 'asc' | 'desc';

function SortableHeader({
  col, label, currentCol, dir, onSort,
}: {
  col: SortCol; label: string; currentCol: SortCol; dir: SortDir; onSort: (col: SortCol) => void;
}) {
  const active = col === currentCol;
  return (
    <th
      className="px-4 py-3 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={clsx('text-xs', active ? 'text-indigo-400' : 'text-slate-600')}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}

function sortTransactions(txs: Transaction[], col: SortCol, dir: SortDir): Transaction[] {
  return [...txs].sort((a, b) => {
    let cmp = 0;
    if (col === 'date') cmp = a.date.localeCompare(b.date);
    else if (col === 'description') cmp = a.description.localeCompare(b.description);
    else if (col === 'amount') cmp = a.amount - b.amount;
    else if (col === 'category') cmp = (a.category?.name ?? '').localeCompare(b.category?.name ?? '');
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const categoryMap = useCategoryMap();
  const [showReview, setShowReview] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const excludeTransaction = useExcludeTransaction();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const catParam = searchParams.get('category');
    return catParam ? { categoryIds: [catParam] } : {};
  });

  const { data: transactions = [], isLoading } = useTransactions(filters);
  const { data: uncategorized = [] } = useUncategorizedTransactions();

  const handleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir(col === 'amount' ? 'desc' : 'asc');
    }
  };

  const sortedTransactions = sortTransactions(transactions, sortCol, sortDir);

  const total = transactions.length;
  const incomeSum = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenseSum = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const handleUnexclude = async (tx: Transaction) => {
    try {
      await excludeTransaction.mutateAsync({ transactionId: tx.id, excluded: false });
      showToast({ type: 'success', title: 'Transaction restored' });
    } catch {
      showToast({ type: 'error', title: 'Failed to restore transaction' });
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="page-header mb-0">Transactions</h1>
          <ExportButton transactions={transactions} />
        </div>

        {/* Uncategorized banner */}
        {uncategorized.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-400">
              <span className="font-semibold">{uncategorized.length}</span> transactions need a category.
            </p>
            <button onClick={() => setShowReview(true)} className="btn-primary text-sm py-1.5">
              Review Uncategorized →
            </button>
          </div>
        )}

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
                    <SortableHeader col="date" label="Date" currentCol={sortCol} dir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 font-medium">Account</th>
                    <SortableHeader col="description" label="Description" currentCol={sortCol} dir={sortDir} onSort={handleSort} />
                    <SortableHeader col="category" label="Category" currentCol={sortCol} dir={sortDir} onSort={handleSort} />
                    <SortableHeader col="amount" label="Amount" currentCol={sortCol} dir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map(tx => (
                    <tr
                      key={tx.id}
                      className={clsx(
                        'border-b border-slate-700/30 table-row-hover',
                        tx.is_excluded && 'opacity-50'
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
                          <span className="text-xs text-slate-500 mt-0.5 block">
                            Excluded{tx.exclude_reason ? `: ${tx.exclude_reason}` : ''}
                            {' · '}
                            <button
                              onClick={() => handleUnexclude(tx)}
                              className="text-indigo-400 hover:text-indigo-300 underline"
                            >
                              Restore
                            </button>
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
      {showReview && <UncategorizedReview onClose={() => setShowReview(false)} />}
    </AppShell>
  );
}
