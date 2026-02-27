import { formatDate, formatAmount } from '@/lib/formatters';
import { clsx } from 'clsx';
import type { UploadPreview } from '@/lib/types';

interface PreviewTableProps {
  preview: UploadPreview;
  categories: Record<string, { name: string; icon: string; color: string }>;
  onConfirm: () => void;
  onBack: () => void;
  loading?: boolean;
}

function ExclusionRow({ reason, count }: { reason: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{reason}</span>
      <span className="text-slate-300 font-medium">{count}</span>
    </div>
  );
}

export function PreviewTable({ preview, categories, onConfirm, onBack, loading }: PreviewTableProps) {
  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Rows', value: preview.total, color: 'text-slate-200' },
          { label: 'To Import', value: preview.toImport, color: 'text-green-400' },
          { label: 'Excluded', value: preview.excluded, color: 'text-slate-500' },
          { label: 'Duplicates', value: preview.duplicate, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Uncategorized warning */}
      {preview.uncategorized > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 flex items-start gap-2">
          <span>⚠</span>
          <div>
            <strong>{preview.uncategorized} transactions</strong> will be marked as "Uncategorized."
            After import, you'll be prompted to assign categories and create keyword rules.
          </div>
        </div>
      )}

      {/* Exclusion breakdown */}
      {Object.keys(preview.exclusionBreakdown).length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Exclusions (not imported)</h3>
          <div className="space-y-1.5">
            {Object.entries(preview.exclusionBreakdown).map(([reason, count]) => (
              <ExclusionRow key={reason} reason={reason} count={count} />
            ))}
          </div>
        </div>
      )}

      {/* Sample rows */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">First 10 Rows Preview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Description</th>
                <th className="pb-2 pr-3">Category</th>
                <th className="pb-2 text-right pr-3">Amount</th>
                <th className="pb-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((row, i) => (
                <tr
                  key={i}
                  className={clsx(
                    'border-b border-slate-700/30',
                    row.isExcluded ? 'opacity-40' : ''
                  )}
                >
                  <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="py-2 pr-3 text-slate-200 max-w-xs truncate">{row.description}</td>
                  <td className="py-2 pr-3">
                    {row.categoryId && categories[row.categoryId] ? (
                      <span
                        className="badge text-xs"
                        style={{
                          backgroundColor: `${categories[row.categoryId].color}22`,
                          color: categories[row.categoryId].color,
                        }}
                      >
                        {categories[row.categoryId].icon} {categories[row.categoryId].name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className={clsx('py-2 pr-3 text-right font-medium', row.amount >= 0 ? 'text-green-400' : 'text-slate-200')}>
                    {formatAmount(row.amount)}
                  </td>
                  <td className="py-2 text-center">
                    {row.isExcluded ? (
                      <span className="text-xs text-slate-500" title={row.excludeReason ?? ''}>Skip</span>
                    ) : (
                      <span className="text-xs text-green-500">Import</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="btn-secondary" disabled={loading}>
          ← Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading || preview.toImport === 0}
          className="btn-primary"
        >
          {loading ? 'Processing...' : `Import ${preview.toImport} Transactions →`}
        </button>
      </div>
    </div>
  );
}
