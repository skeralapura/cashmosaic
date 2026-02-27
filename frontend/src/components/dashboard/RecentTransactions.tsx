import { Link } from 'react-router-dom';
import { useRecentTransactions } from '@/hooks/useTransactions';
import { formatDate, formatAmount } from '@/lib/formatters';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

export function RecentTransactions() {
  const { data: transactions, isLoading } = useRecentTransactions(10);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">Recent Transactions</h3>
        <Link to="/transactions" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          View all →
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : !transactions?.length ? (
        <p className="text-slate-500 text-sm text-center py-8">No transactions yet. Upload a CSV to get started.</p>
      ) : (
        <div className="space-y-0.5">
          {transactions.map(tx => (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg table-row-hover"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{tx.description}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(tx.date)} · {tx.account?.name ?? '—'}
                </p>
              </div>
              {tx.category && (
                <Badge color={tx.category.color} className="flex-shrink-0 hidden sm:flex">
                  {tx.category.icon} {tx.category.name}
                </Badge>
              )}
              <p
                className={`text-sm font-medium flex-shrink-0 ${
                  tx.amount >= 0 ? 'text-green-400' : 'text-slate-200'
                }`}
              >
                {formatAmount(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
