import Papa from 'papaparse';
import { formatDate } from '@/lib/formatters';
import type { Transaction } from '@/lib/types';

interface ExportButtonProps {
  transactions: Transaction[];
}

export function ExportButton({ transactions }: ExportButtonProps) {
  const handleExport = () => {
    const rows = transactions.map(tx => ({
      Date: formatDate(tx.date, 'yyyy-MM-dd'),
      Account: tx.account?.name ?? '',
      Description: tx.description,
      Category: tx.category?.name ?? 'Uncategorized',
      Amount: tx.amount,
      Excluded: tx.is_excluded ? 'Yes' : 'No',
      'Exclude Reason': tx.exclude_reason ?? '',
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cashmosaic-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport} className="btn-secondary text-sm py-1.5 px-3">
      ↓ Export CSV
    </button>
  );
}
