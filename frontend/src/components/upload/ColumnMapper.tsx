import { useForm, Controller } from 'react-hook-form';
import { autoDetectColumns } from '@/lib/columnAutoDetect';
import { validateMapping } from '@/lib/columnAutoDetect';
import { applyMapping } from '@/lib/csvParser';
import { formatDate, formatAmount } from '@/lib/formatters';
import type { ColumnMapping, AmountColumnType } from '@/lib/types';
import { clsx } from 'clsx';

interface ColumnMapperProps {
  headers: string[];
  sampleData: Record<string, string>[];
  initialMapping: ColumnMapping;
  onConfirm: (mapping: ColumnMapping) => void;
  onBack: () => void;
  filename: string;
}

const CONFIDENCE_COLORS = {
  high: 'text-green-400',
  medium: 'text-amber-400',
  low: 'text-orange-400',
  none: 'text-slate-500',
};

const CONFIDENCE_ICONS = {
  high: '✓',
  medium: '~',
  low: '?',
  none: '✕',
};

export function ColumnMapper({ headers, sampleData, initialMapping, onConfirm, onBack, filename }: ColumnMapperProps) {
  const autoDetect = autoDetectColumns(headers, sampleData);
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<ColumnMapping>({
    defaultValues: initialMapping,
  });

  const amountType = watch('amountType') as AmountColumnType;
  const watchedMapping = watch();

  // Live preview rows
  const previewRows = (() => {
    try {
      return applyMapping(sampleData.slice(0, 3), watchedMapping).slice(0, 3);
    } catch {
      return [];
    }
  })();

  const onSubmit = (data: ColumnMapping) => {
    const { valid } = validateMapping(headers, sampleData, data);
    if (!valid) {
      // Errors appear inline via react-hook-form
      return;
    }
    onConfirm(data);
  };

  function getConfidenceFor(column: string): { confidence: string; reason: string } {
    const checks = [
      autoDetect.dateColumn,
      autoDetect.descriptionColumn,
      autoDetect.amountColumn,
      autoDetect.debitColumn,
      autoDetect.creditColumn,
      autoDetect.categoryColumn,
    ];
    const match = checks.find(c => c?.column === column);
    return { confidence: match?.confidence ?? 'none', reason: match?.reason ?? '' };
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* File info */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>📄</span>
        <span className="font-medium text-slate-200">{filename}</span>
        <span>·</span>
        <span>{headers.length} columns detected</span>
      </div>

      {/* Account info */}
      <div className="card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Account Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Account Name *</label>
            <input
              {...register('accountName', { required: 'Account name is required' })}
              className="input"
              placeholder="e.g. Wells Fargo Checking"
            />
            {errors.accountName && <p className="text-xs text-red-400 mt-1">{errors.accountName.message}</p>}
          </div>
          <div>
            <label className="label">Institution</label>
            <input
              {...register('institution')}
              className="input"
              placeholder="e.g. Wells Fargo"
            />
          </div>
          <div>
            <label className="label">Account Type *</label>
            <select {...register('accountType')} className="input">
              <option value="bank">Bank Account</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>
        </div>
      </div>

      {/* Column Mapping */}
      <div className="card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Column Mapping</h3>

        {/* Date Column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Date Column *</label>
            <div className="relative">
              <select {...register('dateColumn', { required: true })} className="input">
                <option value="">Select column...</option>
                {headers.map(h => (
                  <option key={h} value={h}>{h || '(empty)'}</option>
                ))}
              </select>
            </div>
            {(() => {
              const col = watch('dateColumn');
              if (!col) return null;
              const { confidence, reason } = getConfidenceFor(col);
              return (
                <p className={clsx('text-xs mt-1', CONFIDENCE_COLORS[confidence as keyof typeof CONFIDENCE_COLORS])}>
                  {CONFIDENCE_ICONS[confidence as keyof typeof CONFIDENCE_ICONS]} {reason}
                </p>
              );
            })()}
          </div>

          {/* Description Column */}
          <div>
            <label className="label">Description Column *</label>
            <select {...register('descriptionColumn', { required: true })} className="input">
              <option value="">Select column...</option>
              {headers.map(h => (
                <option key={h} value={h}>{h || '(empty)'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount Type */}
        <div>
          <label className="label">Amount Format *</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Controller
                name="amountType"
                control={control}
                render={({ field }) => (
                  <input
                    type="radio"
                    value="single"
                    checked={field.value === 'single'}
                    onChange={() => field.onChange('single')}
                    className="accent-indigo-500"
                  />
                )}
              />
              <span className="text-sm text-slate-300">Single Amount Column</span>
              <span className="text-xs text-slate-500">(positive or negative)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Controller
                name="amountType"
                control={control}
                render={({ field }) => (
                  <input
                    type="radio"
                    value="split"
                    checked={field.value === 'split'}
                    onChange={() => field.onChange('split')}
                    className="accent-indigo-500"
                  />
                )}
              />
              <span className="text-sm text-slate-300">Separate Debit / Credit Columns</span>
              <span className="text-xs text-slate-500">(e.g. Citibank)</span>
            </label>
          </div>
        </div>

        {/* Amount columns */}
        {amountType === 'single' ? (
          <div>
            <label className="label">Amount Column *</label>
            <select {...register('amountColumn', { required: amountType === 'single' })} className="input">
              <option value="">Select column...</option>
              {headers.map(h => (
                <option key={h} value={h}>{h || '(empty)'}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Negative values = expenses, positive = income</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Debit Column (expenses) *</label>
              <select {...register('debitColumn', { required: amountType === 'split' })} className="input">
                <option value="">Select column...</option>
                {headers.map(h => (
                  <option key={h} value={h}>{h || '(empty)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Credit Column (income/payments) *</label>
              <select {...register('creditColumn', { required: amountType === 'split' })} className="input">
                <option value="">Select column...</option>
                {headers.map(h => (
                  <option key={h} value={h}>{h || '(empty)'}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Optional category column */}
        <div>
          <label className="label">Category Column (optional)</label>
          <select {...register('categoryColumn')} className="input">
            <option value="">— None —</option>
            {headers.map(h => (
              <option key={h} value={h}>{h || '(empty)'}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            If your bank provides categories, we'll use them as a fallback when no keyword rule matches.
          </p>
        </div>
      </div>

      {/* Live preview */}
      {previewRows.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Preview (first 3 rows)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="py-2 pr-4 text-slate-300 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="py-2 pr-4 text-slate-200 max-w-xs truncate">{row.description}</td>
                    <td className={clsx('py-2 text-right font-medium', row.amount >= 0 ? 'text-green-400' : 'text-slate-200')}>
                      {formatAmount(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button type="submit" className="btn-primary">
          Preview Import →
        </button>
      </div>
    </form>
  );
}
