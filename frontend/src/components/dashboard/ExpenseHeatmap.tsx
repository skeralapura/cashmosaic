import { useState, useRef, useLayoutEffect } from 'react';
import { parseISO, format, addDays, getDay, getMonth, differenceInCalendarDays } from 'date-fns';
import { useDailyExpenses } from '@/hooks/useDashboard';
import { useDateRange } from '@/context/DateRangeContext';
import { Spinner } from '@/components/ui/Spinner';

const DAY_LABEL_W = 28;
const GAP         = 2;
const MIN_CELL    = 10;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// 5 tiers: 0 = no spend, 1-4 = green → red
const TIER_COLORS = [
  '#1e293b', // slate-800  – no spend
  '#15803d', // green-700  – low
  '#ca8a04', // yellow-600 – medium
  '#ea580c', // orange-600 – high
  '#dc2626', // red-600    – very high
];

const TIER_LABELS = ['No spend', 'Low', 'Medium', 'High', 'Very high'];

function computeThresholds(amounts: number[]): [number, number, number] {
  if (amounts.length < 3) return [50, 150, 300];
  const sorted = [...amounts].sort((a, b) => a - b);
  return [
    sorted[Math.floor(sorted.length * 0.33)],
    sorted[Math.floor(sorted.length * 0.66)],
    sorted[Math.floor(sorted.length * 0.90)],
  ];
}

function getTier(amount: number, thresholds: [number, number, number]): number {
  if (amount <= 0) return 0;
  if (amount <= thresholds[0]) return 1;
  if (amount <= thresholds[1]) return 2;
  if (amount <= thresholds[2]) return 3;
  return 4;
}

export function ExpenseHeatmap() {
  const { data = [], isLoading } = useDailyExpenses();
  const { dateRange } = useDateRange();
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Measure container width so cells can fill it exactly
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dayMap    = new Map(data.map(d => [d.date, d]));
  const thresholds = computeThresholds(data.map(d => d.total));

  const startDate = parseISO(dateRange.startDate);
  const endDate   = parseISO(dateRange.endDate);
  const totalDays = differenceInCalendarDays(endDate, startDate) + 1;
  const startDow  = (getDay(startDate) + 6) % 7; // Mon=0 … Sun=6
  const numWeeks  = Math.ceil((startDow + totalDays) / 7);

  // Fill container width; fall back to MIN_CELL on narrow screens
  const cell = numWeeks > 0 && containerWidth > 0
    ? Math.max(MIN_CELL, Math.floor((containerWidth - DAY_LABEL_W - GAP - numWeeks * GAP) / numWeeks))
    : MIN_CELL;
  const col = cell + GAP;

  // Compute where each month label should appear (first week containing that month)
  const monthLabels: { weekIdx: number; label: string }[] = [];
  let lastMonth = -1;
  for (let wi = 0; wi < numWeeks; wi++) {
    for (let di = 0; di < 7; di++) {
      const offset = wi * 7 + di - startDow;
      if (offset < 0 || offset >= totalDays) continue;
      const d = addDays(startDate, offset);
      const m = getMonth(d);
      if (m !== lastMonth) {
        monthLabels.push({ weekIdx: wi, label: format(d, 'MMM') });
        lastMonth = m;
      }
      break;
    }
  }

  return (
    <div className="card p-5">
      <h2 className="card-title mb-4">Daily Expense Heatmap</h2>

      {/* containerRef sits here so width is always measured, loading or not */}
      <div ref={containerRef} className="w-full">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex flex-col" style={{ gap: 6 }}>

              {/* Month labels */}
              <div className="relative" style={{ height: 14, marginLeft: DAY_LABEL_W + GAP }}>
                {monthLabels.map(({ weekIdx, label }) => (
                  <span
                    key={label}
                    className="absolute text-xs text-slate-400 select-none"
                    style={{ left: weekIdx * col }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Day labels + week columns */}
              <div className="flex" style={{ gap: GAP }}>

                {/* Day-of-week labels (Mon, Wed, Fri only) */}
                <div className="flex flex-col" style={{ gap: GAP, width: DAY_LABEL_W }}>
                  {DAY_LABELS.map((label, i) => (
                    <span
                      key={label}
                      className="text-slate-500 select-none"
                      style={{
                        fontSize: 9,
                        height: cell,
                        lineHeight: `${cell}px`,
                        textAlign: 'right',
                        paddingRight: 4,
                        visibility: i % 2 === 0 ? 'visible' : 'hidden',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {/* Week columns */}
                {Array.from({ length: numWeeks }, (_, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                    {Array.from({ length: 7 }, (_, di) => {
                      const offset = wi * 7 + di - startDow;

                      if (offset < 0 || offset >= totalDays) {
                        return <div key={di} style={{ width: cell, height: cell }} />;
                      }

                      const d       = addDays(startDate, offset);
                      const dateStr = format(d, 'yyyy-MM-dd');
                      const entry   = dayMap.get(dateStr);
                      const tier    = entry ? getTier(entry.total, thresholds) : 0;

                      return (
                        <div
                          key={di}
                          className="rounded-sm cursor-default"
                          style={{ width: cell, height: cell, backgroundColor: TIER_COLORS[tier] }}
                          onMouseEnter={e => {
                            const text = entry
                              ? `${format(d, 'EEE, MMM d')} · $${entry.total.toFixed(2)} (${entry.count} txn${entry.count !== 1 ? 's' : ''})`
                              : `${format(d, 'EEE, MMM d')} · No expenses`;
                            setTooltip({ text, x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 mt-1" style={{ marginLeft: DAY_LABEL_W + GAP }}>
                <span className="text-xs text-slate-500">Less</span>
                {TIER_COLORS.map((color, i) => (
                  <div
                    key={i}
                    title={TIER_LABELS[i]}
                    className="rounded-sm"
                    style={{ width: cell, height: cell, backgroundColor: color }}
                  />
                ))}
                <span className="text-xs text-slate-500">More</span>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-700 border border-slate-600 text-slate-100 text-xs px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
