import { formatCurrency, formatPercent } from '@/lib/formatters';
import { clsx } from 'clsx';

interface KPICardProps {
  title: string;
  value: number;
  type: 'currency' | 'percent' | 'count';
  color?: 'green' | 'red' | 'auto' | 'neutral';
  icon: string;
  subtitle?: string;
}

export function KPICard({ title, value, type, color = 'neutral', icon, subtitle }: KPICardProps) {
  const displayValue =
    type === 'currency'
      ? formatCurrency(value)
      : type === 'percent'
      ? formatPercent(value)
      : value.toLocaleString();

  const resolvedColor =
    color === 'auto' ? (value >= 0 ? 'green' : 'red') : color;

  const textColorClass =
    resolvedColor === 'green'
      ? 'text-green-400'
      : resolvedColor === 'red'
      ? 'text-red-400'
      : 'text-slate-100';

  const savingsRateColor =
    type === 'percent'
      ? value >= 20
        ? 'text-green-400'
        : value >= 10
        ? 'text-amber-400'
        : 'text-red-400'
      : textColorClass;

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p
        className={clsx(
          'text-2xl font-bold tracking-tight',
          type === 'percent' ? savingsRateColor : textColorClass
        )}
      >
        {displayValue}
      </p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
