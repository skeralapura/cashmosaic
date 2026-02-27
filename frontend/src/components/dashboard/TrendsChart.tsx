import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatMonthLabel, formatCompactCurrency, formatPercent } from '@/lib/formatters';
import type { MonthlySummary } from '@/lib/types';

interface TrendsChartProps {
  data: MonthlySummary[];
}

export function TrendsChart({ data }: TrendsChartProps) {
  let cumulative = 0;
  const chartData = data.map(m => {
    cumulative += m.net;
    const savingsRate = m.income > 0 ? (m.net / m.income) * 100 : 0;
    return {
      month: formatMonthLabel(m.month),
      cumulative,
      savingsRate,
    };
  });

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="card p-3 text-sm shadow-xl">
        <p className="text-slate-300 font-medium mb-2">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex gap-4 justify-between">
            <span className="text-slate-400">{p.name === 'cumulative' ? 'Net Savings' : 'Savings Rate'}:</span>
            <span className="text-slate-100 font-medium">
              {p.name === 'cumulative' ? formatCompactCurrency(p.value) : formatPercent(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card p-5">
      <h3 className="section-title">Savings Trend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={v => formatCompactCurrency(v)}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={v => `${v.toFixed(0)}%`}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine yAxisId="left" y={0} stroke="#475569" strokeDasharray="3 3" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cumulative"
            stroke="#22C55E"
            strokeWidth={2.5}
            dot={{ fill: '#22C55E', r: 3 }}
            name="cumulative"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="savingsRate"
            stroke="#6366F1"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            name="savingsRate"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
