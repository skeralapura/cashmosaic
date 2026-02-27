import { useDateRange } from '@/context/DateRangeContext';
import type { DateRangePreset } from '@/context/DateRangeContext';
import { clsx } from 'clsx';

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: 'This Month', value: 'this_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'YTD', value: 'ytd' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Last Year', value: 'last_year' },
];

export function Topbar() {
  const { dateRange, setPreset } = useDateRange();

  return (
    <header className="h-14 border-b border-slate-800 flex items-center px-6 gap-2 bg-slate-900/80 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 ml-auto">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={clsx(
              'px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150',
              dateRange.preset === p.value
                ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-600/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            )}
          >
            {p.label}
          </button>
        ))}

        {/* Custom date inputs */}
        <div className="flex items-center gap-1 ml-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={e => {
              if (e.target.value) {
                // DateRangeContext will be updated via setDateRange with custom preset
              }
            }}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500 w-32"
          />
          <span className="text-slate-600 text-xs">—</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={e => {
              if (e.target.value) {
                // DateRangeContext will be updated
              }
            }}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500 w-32"
          />
        </div>
      </div>
    </header>
  );
}
