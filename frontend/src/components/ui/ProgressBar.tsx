import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number; // 0-100
  color?: string; // CSS color or Tailwind class
  className?: string;
  showLabel?: boolean;
  animated?: boolean;
}

export function ProgressBar({
  value,
  color,
  className,
  showLabel = false,
  animated = false,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-300', {
            'animate-pulse': animated,
          })}
          style={{
            width: `${pct}%`,
            backgroundColor: color ?? '#6366F1',
          }}
        />
      </div>
    </div>
  );
}
