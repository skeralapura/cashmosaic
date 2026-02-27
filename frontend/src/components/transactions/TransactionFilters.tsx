import { useState, useEffect } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import type { TransactionFilters } from '@/lib/types';

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

export function TransactionFiltersBar({ filters, onChange }: TransactionFiltersProps) {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const [search, setSearch] = useState(filters.search ?? '');

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => onChange({ ...filters, search }), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<TransactionFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Text search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search transactions..."
        className="input w-52 text-sm py-1.5"
      />

      {/* Date range */}
      <input
        type="date"
        value={filters.startDate ?? ''}
        onChange={e => update({ startDate: e.target.value || undefined })}
        className="input text-sm py-1.5 w-36"
      />
      <span className="text-slate-500 text-sm">—</span>
      <input
        type="date"
        value={filters.endDate ?? ''}
        onChange={e => update({ endDate: e.target.value || undefined })}
        className="input text-sm py-1.5 w-36"
      />

      {/* Category filter */}
      <select
        value={filters.categoryIds?.[0] ?? ''}
        onChange={e => update({ categoryIds: e.target.value ? [e.target.value] : undefined })}
        className="input text-sm py-1.5 w-44"
      >
        <option value="">All Categories</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
      </select>

      {/* Account filter */}
      <select
        value={filters.accountIds?.[0] ?? ''}
        onChange={e => update({ accountIds: e.target.value ? [e.target.value] : undefined })}
        className="input text-sm py-1.5 w-44"
      >
        <option value="">All Accounts</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {/* Show excluded toggle */}
      <label className="flex items-center gap-1.5 cursor-pointer ml-1">
        <input
          type="checkbox"
          checked={filters.showExcluded ?? false}
          onChange={e => update({ showExcluded: e.target.checked })}
          className="accent-indigo-500"
        />
        <span className="text-sm text-slate-400">Show excluded</span>
      </label>

      {/* Clear filters */}
      {(search || filters.startDate || filters.endDate || filters.categoryIds || filters.accountIds) && (
        <button
          onClick={() => { setSearch(''); onChange({}); }}
          className="btn-ghost text-xs py-1"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
